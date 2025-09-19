"use strict";

/**
 * XMLTV Manager - Asynchronous EPG Loading System
 * Replaces individual EPG API calls with a single XMLTV fetch
 * Implements progressive loading and caching to prevent API overload
 */
var XmltvManager = {
    // Core state management
    isInitialized: false,
    isLoading: false,
    lastFetchTime: null,
    refreshInterval: 45 * 60 * 1000, // 45 minutes in milliseconds
    refreshTimer: null,
    currentRequest: null,
    
    // EPG data storage
    epgCache: new Map(),
    channelEpgMap: new Map(), // Maps channel IDs to their EPG data
    cacheExpiry: 60 * 60 * 1000, // 1 hour cache expiry
    
    // Parsing configuration
    parseChunkSize: 50, // Number of programmes to parse per chunk
    parseDelay: 5, // Milliseconds between chunks to prevent UI blocking
    parsingInProgress: false,
    parseQueue: [],
    
    // Callbacks for UI updates
    updateCallbacks: [],
    
    // Statistics
    stats: {
        totalChannels: 0,
        channelsWithEpg: 0,
        lastUpdateTime: null,
        fetchDuration: 0
    },

    /**
     * Initialize the XMLTV Manager
     */
    init: function() {
        if (this.isInitialized) return;
        
        console.log('XmltvManager: Initializing async EPG loading system');
        this.isInitialized = true;
        
        // Load cached data from localStorage
        this.loadCacheFromStorage();
        
        // Start background XMLTV fetch
        this.scheduleRefresh();
        
        // Set up periodic refresh
        this.setupPeriodicRefresh();
        
        console.log('XmltvManager: Initialization complete');
    },

    /**
     * Register a callback for EPG updates
     * @param {Function} callback - Function to call when EPG data is updated
     */
    onEpgUpdate: function(callback) {
        if (typeof callback === 'function') {
            this.updateCallbacks.push(callback);
        }
    },

    /**
     * Remove an update callback
     * @param {Function} callback - Function to remove from callbacks
     */
    removeEpgUpdateCallback: function(callback) {
        var index = this.updateCallbacks.indexOf(callback);
        if (index > -1) {
            this.updateCallbacks.splice(index, 1);
        }
    },

    /**
     * Get EPG data for a specific channel
     * @param {string} channelId - Channel stream ID
     * @returns {Object|null} EPG data or null if not available
     */
    getChannelEpg: function(channelId) {
        if (!channelId) return null;
        
        var cacheKey = this.getCacheKey(channelId);
        var cachedData = this.epgCache.get(cacheKey);
        
        if (cachedData && !this.isCacheExpired(cachedData.timestamp)) {
            return {
                programmes: cachedData.programmes,
                lastUpdated: cachedData.timestamp,
                fromCache: true
            };
        }
        
        return null;
    },

    /**
     * Get current programme for a channel
     * @param {string} channelId - Channel stream ID
     * @returns {Object|null} Current programme or null
     */
    getCurrentProgramme: function(channelId) {
        var epgData = this.getChannelEpg(channelId);
        if (!epgData || !epgData.programmes) return null;
        
        var now = moment().unix();
        for (var i = 0; i < epgData.programmes.length; i++) {
            var programme = epgData.programmes[i];
            var startTime = moment(programme.start).unix();
            var endTime = moment(programme.stop).unix();
            
            if (startTime <= now && now < endTime) {
                return programme;
            }
        }
        
        return null;
    },

    /**
     * Start asynchronous XMLTV fetch
     * @param {boolean} forceRefresh - Force refresh even if recently fetched
     */
    fetchXmltvAsync: function(forceRefresh) {
        var now = Date.now();
        
        // Check if we should skip this fetch
        if (!forceRefresh && this.lastFetchTime && 
            (now - this.lastFetchTime) < (this.refreshInterval / 2)) {
            console.log('XmltvManager: Skipping fetch, too recent');
            return;
        }
        
        if (this.isLoading) {
            console.log('XmltvManager: Already loading, skipping duplicate request');
            return;
        }
        
        if (settings.playlist_type !== 'xtreme') {
            console.log('XmltvManager: XMLTV only available for xtreme playlist type');
            return;
        }
        
        this.isLoading = true;
        var startTime = Date.now();
        
        console.log('XmltvManager: Starting async XMLTV fetch');
        
        // Cancel any existing request
        if (this.currentRequest) {
            this.currentRequest.abort();
            this.currentRequest = null;
        }
        
        var that = this;
        var url = api_host_url + '/xmltv.php?username=' + user_name + '&password=' + password;
        
        console.log('XmltvManager: Making XMLTV request to:', url);
        console.log('XmltvManager: API host:', api_host_url);
        console.log('XmltvManager: Username:', user_name);
        console.log('XmltvManager: Password length:', password ? password.length : 'undefined');
        
        this.currentRequest = $.ajax({
            url: url,
            method: 'GET',
            timeout: 60000, // 60 second timeout
            async: true, // Non-blocking
            success: function(xmlData) {
                var fetchDuration = Date.now() - startTime;
                that.stats.fetchDuration = fetchDuration;
                that.stats.lastUpdateTime = new Date();
                
                console.log('XmltvManager: XMLTV fetch completed in ' + fetchDuration + 'ms');
                console.log('XmltvManager: Response data type:', typeof xmlData);
                console.log('XmltvManager: Response length:', xmlData ? xmlData.length : 'null/undefined');
                console.log('XmltvManager: First 200 chars:', xmlData ? xmlData.substring(0, 200) : 'No data');
                
                // Check for empty response
                if (!xmlData || xmlData.trim().length === 0) {
                    console.error('XmltvManager: Received empty response from XMLTV endpoint');
                    that.handleFetchError(null, 'empty_response', 'Empty XMLTV response received');
                    return;
                }
                
                that.parseXmltvDataAsync(xmlData);
            },
            error: function(xhr, status, error) {
                console.error('XmltvManager: XMLTV fetch failed:', error);
                that.handleFetchError(xhr, status, error);
            },
            complete: function() {
                that.isLoading = false;
                that.currentRequest = null;
                that.lastFetchTime = Date.now();
            }
        });
    },

    /**
     * Parse XMLTV data asynchronously in chunks
     * @param {string} xmlData - Raw XMLTV XML data
     */
    parseXmltvDataAsync: function(xmlData) {
        if (this.parsingInProgress) {
            console.log('XmltvManager: Parsing already in progress, queuing data');
            this.parseQueue.push(xmlData);
            return;
        }
        
        this.parsingInProgress = true;
        console.log('XmltvManager: Starting async XMLTV parsing');
        
        try {
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(xmlData, "text/xml");
            
            // Check for parsing errors
            var parseError = xmlDoc.getElementsByTagName("parsererror");
            if (parseError.length > 0) {
                throw new Error("XML parsing failed: " + parseError[0].textContent);
            }
            
            // Extract programmes
            var programmes = xmlDoc.getElementsByTagName('programme');
            
            if (programmes.length === 0) {
                console.warn('XmltvManager: No programmes found in XMLTV data');
                this.completeParsing();
                return;
            }
            
            console.log('XmltvManager: Found ' + programmes.length + ' programmes to parse');
            
            // Group programmes by channel
            var channelGroups = {};
            for (var i = 0; i < programmes.length; i++) {
                var programme = programmes[i];
                var channelId = programme.getAttribute('channel');
                
                if (!channelGroups[channelId]) {
                    channelGroups[channelId] = [];
                }
                channelGroups[channelId].push(programme);
            }
            
            // Start chunked processing
            this.processChannelGroupsAsync(channelGroups);
            
        } catch (error) {
            console.error('XmltvManager: Error parsing XMLTV data:', error);
            this.completeParsing();
        }
    },

    /**
     * Process channel groups asynchronously
     * @param {Object} channelGroups - Grouped programmes by channel
     */
    processChannelGroupsAsync: function(channelGroups) {
        var that = this;
        var channelIds = Object.keys(channelGroups);
        var channelIndex = 0;
        
        function processNextChannel() {
            if (channelIndex >= channelIds.length) {
                that.completeParsing();
                return;
            }
            
            var channelId = channelIds[channelIndex];
            var programmes = channelGroups[channelId];
            
            // Process this channel's programmes
            that.processChannelProgrammes(channelId, programmes);
            
            channelIndex++;
            
            // Schedule next channel processing with small delay
            setTimeout(processNextChannel, that.parseDelay);
        }
        
        // Start processing
        processNextChannel();
    },

    /**
     * Process programmes for a specific channel
     * @param {string} channelId - Channel ID
     * @param {Array} programmes - Array of programme elements
     */
    processChannelProgrammes: function(channelId, programmes) {
        var processedProgrammes = [];
        
        for (var i = 0; i < programmes.length; i++) {
            var programme = programmes[i];
            
            try {
                var processedProgramme = {
                    start: programme.getAttribute('start'),
                    stop: programme.getAttribute('stop'),
                    title: this.getElementText(programme, 'title'),
                    description: this.getElementText(programme, 'desc'),
                    category: this.getElementText(programme, 'category')
                };
                
                // Validate required fields
                if (processedProgramme.start && processedProgramme.stop && processedProgramme.title) {
                    processedProgrammes.push(processedProgramme);
                }
            } catch (error) {
                console.warn('XmltvManager: Error processing programme:', error);
            }
        }
        
        if (processedProgrammes.length > 0) {
            // Sort programmes by start time
            processedProgrammes.sort(function(a, b) {
                return moment(a.start).unix() - moment(b.start).unix();
            });
            
            // Cache the programmes
            this.cacheChannelEpg(channelId, processedProgrammes);
            
            // Notify UI of update
            this.notifyEpgUpdate(channelId, processedProgrammes);
            
            this.stats.channelsWithEpg++;
        }
        
        this.stats.totalChannels++;
    },

    /**
     * Get text content from XML element
     * @param {Element} parentElement - Parent XML element
     * @param {string} tagName - Tag name to find
     * @returns {string} Text content or empty string
     */
    getElementText: function(parentElement, tagName) {
        var elements = parentElement.getElementsByTagName(tagName);
        if (elements.length > 0 && elements[0].textContent) {
            return elements[0].textContent.trim();
        }
        return '';
    },

    /**
     * Cache EPG data for a channel
     * @param {string} channelId - Channel ID
     * @param {Array} programmes - Array of programmes
     */
    cacheChannelEpg: function(channelId, programmes) {
        var cacheKey = this.getCacheKey(channelId);
        var timestamp = Date.now();
        
        this.epgCache.set(cacheKey, {
            programmes: programmes,
            timestamp: timestamp,
            channelId: channelId
        });
        
        this.channelEpgMap.set(channelId, cacheKey);
        
        // Save to localStorage for persistence
        this.saveCacheToStorage();
    },

    /**
     * Generate cache key for channel
     * @param {string} channelId - Channel ID
     * @returns {string} Cache key
     */
    getCacheKey: function(channelId) {
        return 'epg_' + channelId;
    },

    /**
     * Check if cache entry is expired
     * @param {number} timestamp - Cache timestamp
     * @returns {boolean} True if expired
     */
    isCacheExpired: function(timestamp) {
        return (Date.now() - timestamp) > this.cacheExpiry;
    },

    /**
     * Notify UI components of EPG updates
     * @param {string} channelId - Channel ID
     * @param {Array} programmes - Updated programmes
     */
    notifyEpgUpdate: function(channelId, programmes) {
        for (var i = 0; i < this.updateCallbacks.length; i++) {
            try {
                this.updateCallbacks[i](channelId, programmes);
            } catch (error) {
                console.error('XmltvManager: Error in update callback:', error);
            }
        }
    },

    /**
     * Complete parsing process
     */
    completeParsing: function() {
        this.parsingInProgress = false;
        
        console.log('XmltvManager: Parsing completed. Stats:', this.stats);
        
        // Process any queued data
        if (this.parseQueue.length > 0) {
            var nextData = this.parseQueue.shift();
            setTimeout(() => {
                this.parseXmltvDataAsync(nextData);
            }, 100);
        }
        
        // Notify completion
        this.notifyEpgUpdate('__PARSING_COMPLETE__', null);
    },

    /**
     * Handle fetch errors
     * @param {Object} xhr - XMLHttpRequest object
     * @param {string} status - Error status
     * @param {string} error - Error message
     */
    handleFetchError: function(xhr, status, error) {
        console.error('XmltvManager: Fetch error - Status:', status, 'Error:', error);
        
        // Schedule retry for certain error types
        if (status === 'timeout' || xhr.status >= 500) {
            console.log('XmltvManager: Scheduling retry in 5 minutes');
            setTimeout(() => {
                this.fetchXmltvAsync(false);
            }, 5 * 60 * 1000); // Retry in 5 minutes
        }
    },

    /**
     * Schedule next refresh
     */
    scheduleRefresh: function() {
        // Start immediate fetch if no cached data exists
        if (this.epgCache.size === 0) {
            console.log('XmltvManager: No cached data, starting immediate fetch');
            setTimeout(() => {
                this.fetchXmltvAsync(false);
            }, 1000); // Small delay to avoid blocking init
        } else {
            console.log('XmltvManager: Using cached data, scheduling background refresh');
            setTimeout(() => {
                this.fetchXmltvAsync(false);
            }, 10000); // Background refresh after 10 seconds
        }
    },

    /**
     * Set up periodic refresh timer
     */
    setupPeriodicRefresh: function() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        var that = this;
        this.refreshTimer = setInterval(function() {
            console.log('XmltvManager: Periodic refresh triggered');
            that.fetchXmltvAsync(false);
        }, this.refreshInterval);
    },

    /**
     * Save cache to localStorage
     */
    saveCacheToStorage: function() {
        try {
            var cacheData = {};
            var that = this;
            
            this.epgCache.forEach(function(value, key) {
                // Only save non-expired entries
                if (!that.isCacheExpired(value.timestamp)) {
                    cacheData[key] = value;
                }
            });
            
            localStorage.setItem(storage_id + 'xmltv_cache', JSON.stringify(cacheData));
            localStorage.setItem(storage_id + 'xmltv_stats', JSON.stringify(this.stats));
            
        } catch (error) {
            console.error('XmltvManager: Error saving cache to storage:', error);
        }
    },

    /**
     * Load cache from localStorage
     */
    loadCacheFromStorage: function() {
        try {
            var cacheData = localStorage.getItem(storage_id + 'xmltv_cache');
            var statsData = localStorage.getItem(storage_id + 'xmltv_stats');
            
            if (cacheData) {
                var parsedData = JSON.parse(cacheData);
                var validEntries = 0;
                
                for (var key in parsedData) {
                    var entry = parsedData[key];
                    if (!this.isCacheExpired(entry.timestamp)) {
                        this.epgCache.set(key, entry);
                        this.channelEpgMap.set(entry.channelId, key);
                        validEntries++;
                    }
                }
                
                console.log('XmltvManager: Loaded ' + validEntries + ' cached EPG entries');
            }
            
            if (statsData) {
                this.stats = Object.assign(this.stats, JSON.parse(statsData));
            }
            
        } catch (error) {
            console.error('XmltvManager: Error loading cache from storage:', error);
        }
    },

    /**
     * Clear all cached data
     */
    clearCache: function() {
        this.epgCache.clear();
        this.channelEpgMap.clear();
        
        localStorage.removeItem(storage_id + 'xmltv_cache');
        localStorage.removeItem(storage_id + 'xmltv_stats');
        
        console.log('XmltvManager: Cache cleared');
    },

    /**
     * Get manager statistics
     * @returns {Object} Current statistics
     */
    getStats: function() {
        return {
            ...this.stats,
            cacheSize: this.epgCache.size,
            isLoading: this.isLoading,
            lastFetchTime: this.lastFetchTime ? new Date(this.lastFetchTime) : null
        };
    },

    /**
     * Force refresh EPG data
     */
    forceRefresh: function() {
        console.log('XmltvManager: Force refresh requested');
        this.clearCache();
        this.fetchXmltvAsync(true);
    },

    /**
     * Cleanup manager resources
     */
    cleanup: function() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        if (this.currentRequest) {
            this.currentRequest.abort();
            this.currentRequest = null;
        }
        
        this.updateCallbacks = [];
        
        console.log('XmltvManager: Cleanup completed');
    }
};