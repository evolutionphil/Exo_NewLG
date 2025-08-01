"use strict";
var login_page={
    is_loading:false,
    device_id_fetched:false,
    keys:{
        focused_part:"main_area",
        main_area:0,
        network_issue_btn:0,
        expired_issue_btn:0,
        no_playlist_btn:0,
        playlist_error_btn:0
    },
    login_succeed:false,
    tried_panel_indexes:[],
    network_issue_btns:$('.network-issue-btn'),
    expired_issue_btns:$('.expired-issue-btn'),
    no_playlist_btns:$('.no-playlist-btn'),
    goBack:function(){
        turn_off_page.init('login-page');
    },
    showLoadImage:function(){
        $('#loading-issue-container').hide();
        $('#loading-page').removeClass('hide');
    },
    showLoginError:function(){
        $('.loading-issue-item').addClass('hide');
        $('#loading-issue-container').show();
    },
    showNetworkErrorModal:function(){
        this.device_id_fetched = false; // Reset flag to allow retry
        this.showLoginError()
        $('#network-issue-container').removeClass('hide');
        this.hoverNetworkIssueBtn(0);
    },
    reloadApp:function(){
        var that=this;
        // Reset all state flags to prevent infinite loops
        this.device_id_fetched = false;
        this.is_loading = false;
        this.tried_panel_indexes = [];

        // Hide all error containers and modals
        $('#loading-issue-container').hide();
        $('.loading-issue-item').addClass('hide');
        $('#playlist-error-modal').modal('hide');

        setTimeout(function () {
            that.fetchPlaylistInformation();
        },200)
    },
    continueDemoPlaylist:function(){
        var that=this;
        $('#loading-issue-container').hide();
        $('.loading-issue-item').addClass('hide');
        setTimeout(function () {
            that.login();
        },200)
    },
    exit:function(){
        exitApp();
    },
    enterActivationPage:function(){
        activation_page.init('login-page');
    },
    fetchPlaylistInformation:function(){
        console.log('=== DEBUG fetchPlaylistInformation ===');

        if(this.is_loading)
            return;
        this.showLoadImage();
        var that=this;
        this.is_loading=true;
        var temps=pickPanelUrl(this.tried_panel_indexes);
        var url=temps[1],url_index=temps[0];
        var version=platform==='samsung' ? samsung_version : lg_version;
        var data={
            app_device_id:device_id,
            app_type:platform,
            version:version
        }

        // Debug logging
        console.log('Panel URL:', url);
        console.log('Device ID:', device_id);
        console.log('Platform:', platform);
        console.log('Data to send:', data);

        var encrypted_data=encryptRequest(data);

        $.ajax({
            url: url+"/device_info",
            type: "POST",
            data:{
                data:encrypted_data
            },
            timeout: 15000, // 15 second timeout
            crossDomain: true, // Explicitly allow cross-domain
            success: function (data1) {
                console.log('=== DEBUG API Success ===');
                console.log('Raw response:', data1);

                try {
                    var data=decryptResponse(data1);
                    console.log('Decrypted data:', data);

                    // Check if response is valid
                    if(!data || typeof data !== 'object') {
                        console.error('Invalid response format:', data);
                        throw new Error('Invalid response format');
                    }

                    // Check if backend MAC generation failed
                    if(!data.mac_address || data.mac_address.trim() === '') {
                        console.error('Backend MAC generation failed - no MAC address returned');
                        throw new Error('No MAC address in response');
                    }

                    console.log('MAC Address received:', data.mac_address);

                    that.tried_panel_indexes=[];
                    localStorage.setItem(storage_id+'api_data',JSON.stringify(data));
                    that.loadApp(data);

                } catch(decryptError) {
                    console.error('=== DEBUG Decryption/Processing Error ===');
                    console.error('Error:', decryptError);
                    console.error('Raw response that failed:', data1);

                    // Try next panel URL
                    if(that.tried_panel_indexes.length<panel_urls.length){
                        that.is_loading=false;
                        that.tried_panel_indexes.push(url_index);
                        that.fetchPlaylistInformation();
                        return;
                    } else {
                        that.is_loading=false;
                        that.showNetworkErrorModal();
                        return;
                    }
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                console.log('=== DEBUG API Request Error ===');
                console.log('XHR Status:', xhr.status);
                console.log('XHR StatusText:', xhr.statusText);
                console.log('Text Status:', textStatus);
                console.log('Error Thrown:', errorThrown);
                console.log('Response Text:', xhr.responseText);
                console.log('Ready State:', xhr.readyState);
                console.log('Panel URL that failed:', url);
                console.log('Tried panel indexes:', that.tried_panel_indexes);
                console.log('Total panel URLs:', panel_urls.length);

                // Specific error handling
                if(xhr.status === 0) {
                    console.error('Network error - possible CORS, timeout, or connectivity issue');
                } else if(xhr.status >= 500) {
                    console.error('Server error:', xhr.status);
                } else if(xhr.status >= 400) {
                    console.error('Client error:', xhr.status);
                }

                if(that.tried_panel_indexes.length<panel_urls.length){
                    that.is_loading=false;
                    that.tried_panel_indexes.push(url_index);
                    console.log('Trying next panel URL, current failed indexes:', that.tried_panel_indexes);
                    that.fetchPlaylistInformation();
                }else{
                    console.log('All panel URLs failed, checking localStorage for cached data');
                    var api_data=localStorage.getItem(storage_id+'api_data');
                    if(api_data){
                        console.log('Using cached API data');
                        api_data=JSON.parse(api_data);
                        that.loadApp(api_data);
                    }else{
                        console.log('No cached data available, showing network error');
                        that.is_loading=false;
                        that.showNetworkErrorModal();
                    }
                }
            }
        });
    },
    loadApp:function(data){
        var today=moment().format('Y-MM-DD');
        saveData('mac_address', data.mac_address);
        settings.saveSettings('mac_address',data.mac_address,'');
        console.log(mac_address);
        $('#mac-address').text(mac_address);
        $('.mac-address').text(mac_address);
        saveData('playlist_urls',data.playlists);
        $('.loading-page-device-info-container').slideDown();
        saveData('languages',data.languages)
        saveData('expire_date',data.expire_date);
        saveData('is_trial',data.is_trial);
        saveData('focus_colors',data.focus_colors);
        saveData('epg_colors',data.epg_colors);
        saveData('bg_focus_colors',data.bg_focus_colors);

        console.log(data.site_domain);
        $('.site-domain').text(data.site_domain);
        console.log(data);
        if(data.lock)
            settings.saveSettings('lock_state',data.lock==0 ? 'off' : 'on','');
        if(settings.focus_color)
            assignColorCode(settings.focus_color,'focus');
        if(settings.epg_txt_color)
            assignColorCode(settings.epg_txt_color,'epg');
        if(settings.bg_focus_color)
            assignColorCode(settings.bg_focus_color,'bg_focus_color');

        this.is_loading=false;
        $('.expire-date').text(expire_date);
        saveData('demo_url',data.demo_url);
        if(data.expire_date<today){
            saveData('mac_valid',false);
            this.showLoginError()
            $('#expired-issue-container').removeClass('hide');
            this.hoverExpiredIssueBtn(0);
        }
        else{
            if(data.playlists.length==0)
                saveData('has_playlist',false)
            else
                saveData('has_playlist',true)
            this.login();
        }
    },
    getPlayListDetail:function(){
        this.device_id_fetched = true;

        var that=this;
        // mac_address='a0:d0:5b:02:d7:6a';
        // mac_address='52:54:00:12:34:59';
        // mac_address='66:36:66:66:06:24';
        device_id='52:54:00:12:34:57'
        if(platform==='samsung'){
            try{
                // First try: Get DUID and send to backend for MAC generation
                var duid = webapis.productinfo.getDuid();
                if(duid && duid.trim() !== ''){
                    device_id = btoa(duid); // Base64 encode DUID like Tizen ID
                    this.fetchPlaylistInformation();
                    return;
                }
            }catch (e){
                console.log('DUID not available, trying Tizen ID fallback');
            }

            try{
                // Second try: Get Tizen ID and send to backend for MAC generation
                var temps=tizen.systeminfo.getCapability('http://tizen.org/system/tizenid')
                if(temps && temps.trim() !== ''){
                    device_id=btoa(temps); // Base64 encode Tizen ID
                    this.fetchPlaylistInformation();
                    return;
                }
            }catch (e){
                console.log('Tizen ID not available, using hardcoded fallback');
            }

            // Final fallback: Use hardcoded device ID
            this.fetchPlaylistInformation();
        }
        else if(platform==='lg'){
            webOS.service.request("luna://com.webos.service.sm", {
                method: "deviceid/getIDs",
                parameters: {
                    "idType": ["LGUDID"]
                },
                onSuccess: function (inResponse) {
                    // mac_address = "";
                    // var temp = inResponse.idList[0].idValue.replace(/['-]+/g, '');
                    // for (var i = 0; i <= 5; i++) {
                    //     mac_address += temp.substr(i * 2, 2);
                    //     if (i < 5)
                    //         mac_address += ":";
                    // }
                    device_id = inResponse.idList[0].idValue
                    that.fetchPlaylistInformation();
                },
                onFailure: function (inError) {
                    that.fetchPlaylistInformation();
                }
            });
        }
    },
    login:function(){
        console.log('=== DEBUG login() called ===');
        console.log('=== DEBUG playlist_urls ===', playlist_urls);
        console.log('=== DEBUG has_playlist ===', has_playlist);
        this.showLoadImage();

        // Check if user has uploaded playlists (non-empty playlist_urls)
        if(playlist_urls && playlist_urls.length > 0){
            var playlist_id = settings.playlist_id;
            var playlist_index = 0;

            // Find user's preferred playlist
            for(var i = 0; i < playlist_urls.length; i++){
                if(playlist_urls[i].id == playlist_id){
                    playlist_index = i;
                    break;
                }
            }

            var user_playlist = playlist_urls[playlist_index];
            console.log('=== DEBUG: User has uploaded playlists - using user playlist ===');
            console.log('Using playlist:', user_playlist);
            settings.saveSettings('playlist', user_playlist, 'array');
            settings.saveSettings('playlist_id', user_playlist.id, '');
            parseM3uUrl();
            console.log('Parsed M3U URL - API Host:', api_host_url);
            this.proceed_login();
        } else {
            // No uploaded playlists (empty playlist_urls) - use demo content
            console.log('=== DEBUG: No uploaded playlists found ===');
            console.log('=== DEBUG: Checking demo_url ===', demo_url);

            this.tryDemoContent();
        }
    },

    tryDemoContent:function(){
        var that = this;

        // First try backend demo URL if available
        var backend_demo_url = null;
        var backend_demo_playlist = null;

        if(demo_url) {
            // Handle both string and object formats
            if(typeof demo_url === 'string' && demo_url.trim() !== '') {
                backend_demo_url = demo_url;
                backend_demo_playlist = {
                    id: 'backend_demo',
                    name: 'Backend Demo Content',
                    url: backend_demo_url,
                    type: 'general'
                };
            } else if(typeof demo_url === 'object' && demo_url.url && demo_url.url.trim() !== '') {
                backend_demo_url = demo_url.url;
                backend_demo_playlist = {
                    id: demo_url.id || 'backend_demo',
                    name: demo_url.name || 'Backend Demo Content',
                    url: demo_url.url,
                    type: demo_url.type || 'general'
                };
            }
        }

        if(backend_demo_url && backend_demo_playlist) {
            console.log('=== DEBUG: Trying backend demo URL ===');
            console.log('Backend Demo URL:', backend_demo_url);
            console.log('Backend Demo Playlist:', backend_demo_playlist);

            // Set backend demo playlist
            settings.saveSettings('playlist', backend_demo_playlist, 'array');
            settings.saveSettings('playlist_id', backend_demo_playlist.id, '');
            parseM3uUrl();
            console.log('Parsed M3U URL - API Host:', api_host_url);

            // Try to load backend demo content
            this.proceed_login();
        } else {
            console.log('=== DEBUG: No backend demo URL, using local demo playlist ===');
            this.useLocalDemoPlaylist();
        }
    },

    useLocalDemoPlaylist:function(){
        var local_demo_playlist = {
            id: 'local_demo',
            name: 'Local Demo Playlist',
            url: './assets/tv_channels_flixdemo_plus.m3u',
            type: 'general'
        };
        settings.saveSettings('playlist', local_demo_playlist, 'array');
        settings.saveSettings('playlist_id', local_demo_playlist.id, '');
        console.log('=== DEBUG: No user playlists found, using local demo playlist ===');
        console.log('Local playlist:', local_demo_playlist);
        parseM3uUrl();
        console.log('Parsed M3U URL - API Host:', api_host_url);
        this.proceed_login();
    },

    goToPlaylistPageWithError:function(){
        console.log('=== DEBUG goToPlaylistPageWithError ===');
        this.is_loading = false;
        this.device_id_fetched = false; // Reset flag to prevent infinite loop

        // Initialize with empty data to keep app functional
        LiveModel.insertMoviesToCategories([])
        VodModel.insertMoviesToCategories([]);
        SeriesModel.insertMoviesToCategories([]);

        // Hide loading
        $('.loader-image-container').addClass('hide');

        // Show playlist error popup instead of redirecting
        this.showPlaylistErrorModal();
    },

    showPlaylistErrorModal:function(){
        console.log('=== Showing playlist error modal ===');

        // Reset modal content to default state first
        $('#playlist-error-main-message').show();
        $('#playlist-error-reasons').show();
        $('#playlist-error-sub-message').show();
        $('#demo-content-status').hide();
        $('#demo-content-message').hide();

        // Ensure all buttons are visible by default
        $('.playlist-error-btn').show();

        // Show/hide switch playlist button based on available playlists
        if(playlist_urls && playlist_urls.length > 1) {
            $('#switch-playlist-btn').show();
        } else {
            $('#switch-playlist-btn').hide();
        }

        // Set initial focus state
        this.keys.focused_part = 'playlist_error_btn';
        this.keys.playlist_error_btn = 0;

        // Store visible button references
        this.playlist_error_btn_doms = $('.playlist-error-btn:visible');

        // Remove any previous modal shown handlers to prevent duplicates
        $('#playlist-error-modal').off('shown.bs.modal');

        var that = this;

        // When modal is fully rendered, set focus properly (important for Tizen)
        $('#playlist-error-modal').on('shown.bs.modal', function() {
            console.log('Playlist modal fully visible, setting focus...');
            console.log('Active element before focus:', document.activeElement);
            console.log('Modal z-index:', $('#playlist-error-modal').css('z-index'));
            
            // CRITICAL: Force modal focus state immediately
            that.keys.focused_part = 'playlist_error_btn';
            that.keys.playlist_error_btn = 0;
            
            // Ensure modal completely captures all focus
            $('#playlist-error-modal').attr('tabindex', '0');
            $('#playlist-error-modal').focus();
            
            // Block all background interactions completely
            $('body').addClass('modal-open');
            $('.modal-backdrop').css('z-index', '9998');
            $('#playlist-error-modal').css('z-index', '9999');
            
            // Disable all background elements
            $('*').not('#playlist-error-modal, #playlist-error-modal *').attr('tabindex', '-1');
            
            setTimeout(function() {
                // Force focus state
                that.keys.focused_part = 'playlist_error_btn';
                that.hoverPlaylistErrorBtn(0);
                
                // Ensure the modal itself has focus
                $('#playlist-error-modal').focus();
                
                console.log('Modal focus state set to:', that.keys.focused_part);
                console.log('Active element after focus:', document.activeElement);
                console.log('Modal focused_part:', that.keys.focused_part);
            }, 150);
        });

        // Activate the modal and make sure background click/escape don't close it
        $('#playlist-error-modal').modal({
            backdrop: 'static',
            keyboard: false
        });

        // Show the modal (this will trigger the .on('shown.bs.modal') above)
        $('#playlist-error-modal').modal('show');
    },

    hoverPlaylistErrorBtn:function(index){
        console.log('=== Hovering playlist error button ===');
        console.log('Index:', index);
        
        var keys=this.keys;
        keys.focused_part='playlist_error_btn';
        
        // Update button references (refresh in case visibility changed)
        this.playlist_error_btn_doms = $('.playlist-error-btn:visible');
        
        console.log('Visible buttons count:', this.playlist_error_btn_doms.length);
        console.log('Available buttons:', this.playlist_error_btn_doms.map(function() { return $(this).text().trim(); }).get());
        
        // Boundary check with logging
        if(index >= this.playlist_error_btn_doms.length) {
            console.log('Index out of bounds, reset to 0');
            index = 0;
        }
        if(index < 0) {
            console.log('Index below 0, reset to max');
            index = this.playlist_error_btn_doms.length - 1;
        }
        
        keys.playlist_error_btn = index;
        
        // Remove active class from all buttons (same as terms modal)
        $(this.playlist_error_btn_doms).removeClass('active');
        
        // Apply active class to selected button and focus (same pattern as terms modal)
        if(this.playlist_error_btn_doms.length > 0 && index < this.playlist_error_btn_doms.length) {
            $(this.playlist_error_btn_doms[index]).addClass('active');
            
            // Actually focus the DOM element and ensure it's active
            try {
                // Force focus on the button
                $(this.playlist_error_btn_doms[index]).focus();
                
                // Also set tabindex to ensure it's focusable
                $(this.playlist_error_btn_doms[index]).attr('tabindex', '0');
                
                // Remove tabindex from other buttons
                $(this.playlist_error_btn_doms).not(this.playlist_error_btn_doms[index]).attr('tabindex', '-1');
                
                console.log('Focused DOM element for button:', index);
                console.log('Button text:', $(this.playlist_error_btn_doms[index]).text().trim());
            } catch(e) {
                console.log('Focus failed:', e);
            }
            
            console.log('Applied active class to button:', index);
        } else {
            console.log('No buttons available or index invalid');
        }
    },

    closePlaylistErrorModal:function(){
        // Close modal (same as terms modal goBack method)
        $('#playlist-error-modal').modal('hide');
        
        // CRITICAL: Restore all background element tabindex
        $('*').removeAttr('tabindex');
        
        // Reset focus state (same pattern as terms modal)
        this.keys.focused_part = 'main_area';
        this.keys.main_area = 0;

        // Reset demo content status display
        $('#demo-content-status').hide();
        $('#demo-content-message').hide();
        $('#playlist-error-main-message').show();
        $('#playlist-error-reasons').show();
        $('#playlist-error-sub-message').show();
        $('.playlist-error-btn').show();
        
        // Remove modal event handlers
        $('#playlist-error-modal').off('shown.bs.modal');
        
        console.log('Modal closed, focus restored to:', this.keys.focused_part);
    },

    retryPlaylistLoad:function(){
        console.log('=== Retry playlist load ===');
        this.closePlaylistErrorModal();
        this.tried_panel_indexes = []; // Reset tried panels
        this.is_loading = false;
        this.device_id_fetched = false;
        
        $('.loader-image-container').removeClass('hide');

        console.log('=== DEBUG: Retrying with user playlist ===');
        console.log('User playlist:', settings.playlist);

        this.showLoadImage();
        setTimeout(() => {
           this.fetchPlaylistInformation();
        }, 500);
    },

    switchToNextPlaylist:function(){
        if(!playlist_urls || playlist_urls.length <= 1) {
            console.log('=== DEBUG: No alternative playlists available ===');
            return;
        }

        console.log('=== Switch to next playlist ===');
        this.closePlaylistErrorModal();
        this.tried_panel_indexes = []; // Reset tried panels
        this.is_loading = false;
        this.device_id_fetched = false;

        // Find current playlist index
        var current_playlist_id = settings.playlist_id;
        var current_index = 0;
        for(var i = 0; i < playlist_urls.length; i++) {
            if(playlist_urls[i].id == current_playlist_id) {
                current_index = i;
                break;
            }
        }

        // Switch to next playlist (loop back to first if at end)
        var next_index = (current_index + 1) % playlist_urls.length;
        var next_playlist = playlist_urls[next_index];

        console.log('=== DEBUG: Switching to next playlist ===');
        console.log('Current playlist:', settings.playlist);
        console.log('Next playlist:', next_playlist);

        // Update settings with new playlist
        settings.saveSettings('playlist', next_playlist, 'array');
        settings.saveSettings('playlist_id', next_playlist.id, '');

        this.showLoadImage();
        setTimeout(() => {
            this.login();
        }, 500);
    },

    continueWithoutPlaylist:function(){
        console.log('=== Continue without playlist ===');
        this.is_loading = false;
        this.device_id_fetched = false;

        console.log('=== DEBUG: Continue without playlist called ===');
        console.log('Backend demo_url:', demo_url);
        $('.loader-image-container').removeClass('hide');

        // Update modal to show loading demo content
        this.showDemoContentStatus('Loading demo content...');

        // Temporarily store current user playlist
        var user_playlist = settings.playlist;
        var user_playlist_id = settings.playlist_id;

        var that = this;

        // Function to try local demo playlist
        function tryLocalDemo() {
            console.log('=== DEBUG: Trying local demo playlist ===');
            var local_demo_playlist = {
                id: 'local_demo',
                name: 'Local Demo Content',
                url: './assets/tv_channels_flixdemo_plus.m3u',
                type: 'general'
            };

            // Set local demo playlist temporarily
            settings.playlist = local_demo_playlist;
            parseM3uUrl();

            $.ajax({
                method: 'get',
                url: './assets/tv_channels_flixdemo_plus.m3u',
                timeout: 15000,
                success: function(data) {
                    console.log('=== DEBUG: Local demo content loaded successfully ===');
                    parseM3uResponse('type1', data);

                    // Restore user's original playlist settings
                    settings.playlist = user_playlist;
                    settings.playlist_id = user_playlist_id;

                    // Show success in modal briefly before closing
                    that.showDemoContentStatus('Demo Content', 'Using local demo content until your playlist is working');

                    setTimeout(function() {
                        // Force close modal completely
                        $('#playlist-error-modal').modal('hide');
                        $('#playlist-error-modal').removeClass('show');
                        $('.modal-backdrop').remove();
                        $('body').removeClass('modal-open').css('padding-right', '');

                        that.keys.focused_part = 'main_area';
                        that.keys.main_area = 0;
                        that.is_loading = false;

                        // Remove modal event handlers
                        $('#playlist-error-modal').off('shown.bs.modal');

                        $('#loading-page').addClass('hide');
                        home_page.init();
                    }, 1200);
                },
                error: function(error) {
                    console.log('=== DEBUG: Local demo content also failed ===');
                    console.log('Error:', error);

                    // Restore user's original playlist settings
                    settings.playlist = user_playlist;
                    settings.playlist_id = user_playlist_id;

                    // Show error in modal
                    that.showDemoContentStatus('Error', 'No demo content available');

                    setTimeout(function() {
                        // Force close modal completely
                        $('#playlist-error-modal').modal('hide');
                        $('#playlist-error-modal').removeClass('show');
                        $('.modal-backdrop').remove();
                        $('body').removeClass('modal-open').css('padding-right', '');

                        that.keys.focused_part = 'main_area';
                        that.keys.main_area = 0;
                        that.is_loading = false;

                        // Remove modal event handlers
                        $('#playlist-error-modal').off('shown.bs.modal');
                        // Final fallback - empty data
                        LiveModel.insertMoviesToCategories([]);
                        VodModel.insertMoviesToCategories([]);
                        SeriesModel.insertMoviesToCategories([]);

                        $('#loading-page').addClass('hide');
                        home_page.init();
                    }, 1500);
                }
            });
        }

        // First try backend demo URL if available
        var backend_demo_url = null;
        var backend_demo_playlist = null;

        console.log('=== DEBUG: Checking demo_url ===');
        console.log('demo_url type:', typeof demo_url);
        console.log('demo_url value:', demo_url);

        if(demo_url) {
            // Handle both string and object formats
            if(typeof demo_url === 'string' && demo_url.trim() !== '') {
                backend_demo_url = demo_url;
                backend_demo_playlist = {
                    id: 'backend_demo',
                    name: 'Backend Demo Content',
                    url: backend_demo_url,
                    type: 'general'
                };
            } else if(typeof demo_url === 'object' && demo_url.url && demo_url.url.trim() !== '') {
                backend_demo_url = demo_url.url;
                backend_demo_playlist = {
                    id: demo_url.id || 'backend_demo',
                    name: demo_url.name || 'Backend Demo Content',
                    url: demo_url.url,
                    type: 'general'
                };
            }
        }

        console.log('=== DEBUG: Processed demo data ===');
        console.log('backend_demo_url:', backend_demo_url);
        console.log('backend_demo_playlist:', backend_demo_playlist);

        if(backend_demo_url && backend_demo_playlist) {
            console.log('=== DEBUG: Trying backend demo URL ===');
            console.log('Backend Demo URL:', backend_demo_url);
            console.log('Backend Demo Playlist:', backend_demo_playlist);

            // Set backend demo playlist temporarily
            settings.playlist = backend_demo_playlist;
            parseM3uUrl();

            $.ajax({
                method: 'get',
                url: backend_demo_url,
                timeout: 15000,
                success: function(data) {
                    console.log('=== DEBUG: Backend demo content loaded successfully ===');
                    parseM3uResponse('type1', data);

                    // Restore user's original playlist settings
                    settings.playlist = user_playlist;
                    settings.playlist_id = user_playlist_id;

                    // Show success in modal briefly before closing
                    that.showDemoContentStatus('Demo Content', 'Using backend demo content until your playlist is working');

                    setTimeout(function() {
                        // Force close modal completely
                        $('#playlist-error-modal').modal('hide');
                        $('#playlist-error-modal').removeClass('show');
                        $('.modal-backdrop').remove();
                        $('body').removeClass('modal-open').css('padding-right', '');

                        that.keys.focused_part = 'main_area';
                        that.keys.main_area = 0;
                        that.is_loading = false;

                        // Remove modal event handlers
                        $('#playlist-error-modal').off('shown.bs.modal');

                        $('#loading-page').addClass('hide');
                        home_page.init();
                    }, 1200);
                },
                error: function(error) {
                    console.log('=== DEBUG: Backend demo content failed, trying local ===');
                    console.log('Backend demo error:', error);

                    // Restore user's original playlist settings first
                    settings.playlist = user_playlist;
                    settings.playlist_id = user_playlist_id;

                    // Try local demo as fallback
                    tryLocalDemo();
                }
            });
        } else {
            console.log('=== DEBUG: No backend demo URL, trying local demo ===');
            tryLocalDemo();
        }
    },

    showDemoContentStatus:function(title, message) {
        // Hide original error content
        $('#playlist-error-main-message').hide();
        $('#playlist-error-reasons').hide();
        $('#playlist-error-sub-message').hide();
        $('.playlist-error-btn').hide();

        // Show demo content status
        if(title === 'Loading demo content...') {
            $('#demo-content-status').html('<i class="fa fa-spinner fa-spin" style="margin-right: 15px; color: #FFA500;"></i>' + title).show();
            $('#demo-content-message').hide();
        } else if(title === 'Demo Content') {
            $('#demo-content-status').html('<i class="fa fa-check-circle" style="margin-right: 15px; color: #4CAF50;"></i>' + title).show();
            $('#demo-content-message').text(message).show();
        } else if(title === 'Error') {
            $('#demo-content-status').html('<i class="fa fa-exclamation-triangle" style="margin-right: 15px; color: #ff4832;"></i>' + title).show();
            $('#demo-content-message').text(message).show();
        }
    },
    proceed_login:function(){
        if(this.is_loading)
            return;
        console.log('=== DEBUG proceed_login ===');
        console.log('Playlist type:', settings.playlist_type);
        console.log('API host URL:', api_host_url);
        console.log('Username:', user_name);
        console.log('Password:', password);
        $('#playlist-error').hide();
        LiveModel.init();
        VodModel.init();
        SeriesModel.init();
        var that=this;
        var playlist_type=settings.playlist_type;
        this.is_loading=true;
        if(playlist_type==='xtreme'){
            var  prefix_url=api_host_url+'/player_api.php?username='+user_name+'&password='+password+'&action=';
            var login_url=prefix_url.replace("&action=","");
            $.ajax({
                method:'get',
                url:login_url,
                success:function (data) {
                    if(typeof  data.server_info!="undefined")
                        calculateTimeDifference(data.server_info.time_now,data.server_info.timestamp_now)
                    if(typeof  data.user_info!="undefined"){
                        if(data.user_info.auth==0 || (typeof data.user_info.status!='undefined' && (data.user_info.status==='Expired' || data.user_info.status==='Banned'))){
                            that.is_loading=false;
                            that.goToPlaylistPageWithError();
                        }
                        else{
                            // if(data.user_info.exp_date==null)
                            //     $('.expire-date').text('Unlimited');
                            // else{
                            //     var exp_date_obj=moment(data.user_info.exp_date*1000);
                            //     $('.expire-date').text(exp_date_obj.format('Y-MM-DD'));
                            // }
                            $.when(
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_live_streams',
                                    success:function (data) {
                                        LiveModel.setMovies(data);
                                    }
                                }),
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_live_categories',
                                    success:function (data) {
                                        LiveModel.setCategories(data);
                                    }
                                }),
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_vod_categories',
                                    success:function (data) {
                                        VodModel.setCategories(data);
                                    }
                                }),
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_series_categories',
                                    success:function (data) {
                                        SeriesModel.setCategories(data);
                                    }
                                }),
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_vod_streams',
                                    success:function (data) {
                                        VodModel.setMovies(data);
                                    }
                                }),
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_series',
                                    success:function (data) {
                                        SeriesModel.setMovies(data);
                                    }
                                })
                            ).
                            then(function(){
                                try{
                                    LiveModel.insertMoviesToCategories();
                                    VodModel.insertMoviesToCategories();
                                    SeriesModel.insertMoviesToCategories();
                                    that.is_loading=false;
                                    that.retry_count = 0; // Reset retry count on success
                                    home_page.init();
                                }catch (e) {
                                    console.log(e);
                                    that.goToPlaylistPageWithError();
                                }
                            }).fail(function (e) {
                                console.log(e);
                                that.goToPlaylistPageWithError();
                            })
                        }
                    }
                },
                error:function(error){
                    console.log('=== DEBUG Xtreme API Error ===');
                    console.log('Error:', error);
                    console.log('Status:', error.status);
                    console.log('StatusText:', error.statusText);
                    that.is_loading=false;

                    // If this was a user playlist that failed, show error modal
                    // If this was demo content that failed, try local demo
                    if(settings.playlist.id === 'backend_demo') {
                        console.log('=== DEBUG: Backend demo failed, trying local demo ===');
                        that.useLocalDemoPlaylist();
                    } else if(settings.playlist.id === 'local_demo') {
                        console.log('=== DEBUG: Local demo also failed ===');
                        that.goToPlaylistPageWithError();
                    } else {
                        // User playlist failed
                        that.goToPlaylistPageWithError();
                    }
                },
                timeout: 15000
            })
        }
        else{
            api_host_url=settings.playlist.url;
            $.ajax({
                method:'get',
                url:api_host_url,
                timeout:240000,
                success:function (data) {
                    console.log('=== DEBUG M3U Success ===');
                    parseM3uResponse('type1',data);
                    $('#loading-page').addClass('hide');
                    home_page.init();
                    that.is_loading=false;
                },
                error:function(error){
                    console.log('=== DEBUG M3U Error ===');
                    console.log('Error:', error);
                    console.log('Status:', error.status);
                    console.log('StatusText:', error.statusText);

                    that.is_loading=false;

                    // If this was a user playlist that failed, show error modal
                    // If this was demo content that failed, try local demo
                    if(settings.playlist.id === 'backend_demo') {
                        console.log('=== DEBUG: Backend demo failed, trying local demo ===');
                        that.useLocalDemoPlaylist();
                    } else if(settings.playlist.id === 'local_demo') {
                        console.log('=== DEBUG: Local demo also failed ===');
                        that.goToPlaylistPageWithError();
                    } else {
                        // User playlist failed
                        that.goToPlaylistPageWithError();
                    }
                }
            })
        }
    },
    hoverNetworkIssueBtn:function(index){
        var keys=this.keys;
        keys.focused_part='network_issue_btn';
        keys.network_issue_btn=index;
        $(this.network_issue_btns).removeClass('active');
        $(this.network_issue_btns[index]).addClass('active');
    },
    hoverExpiredIssueBtn:function(index){
        var keys=this.keys;
        keys.focused_part='expired_issue_btn';
        keys.expired_issue_btn=index;
        $(this.expired_issue_btns).removeClass('active');
        $(this.expired_issue_btns[index]).addClass('active');
    },
    hoverNoPlaylistBtn:function(index){
        var keys=this.keys;
        keys.focused_part='no_playlist_btn';
        keys.no_playlist_btn=index;
        $(this.no_playlist_btns).removeClass('active');
        $(this.no_playlist_btns[index]).addClass('active');
    },
    handleMenuClick:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "network_issue_btn":
                $(this.network_issue_btns[keys.network_issue_btn]).trigger('click');
                break;
            case "no_playlist_btn":
                $(this.no_playlist_btns[keys.no_playlist_btn]).trigger('click');
                break;
            case "expired_issue_btn":
                $(this.expired_issue_btns[keys.expired_issue_btn]).trigger('click');
                break;
            case "playlist_error_btn":
                var visibleButtons = $('.playlist-error-btn:visible');
                var buttonIndex = keys.playlist_error_btn;

                if(buttonIndex === 0) {
                    // First button is always "Retry Loading"
                    this.retryPlaylistLoad();
                } else if(visibleButtons.length === 3 && buttonIndex === 1) {
                    // If 3 buttons visible, middle is "Switch Playlist"
                    this.switchToNextPlaylist();
                } else {
                    // Last button is always "Continue Anyway"
                    this.continueWithoutPlaylist();
                }
                break;
        }
    },
    handleMenuUpDown:function(increment){
        var keys=this.keys;
        if(keys.focused_part==="main_area"){
            keys.main_area+=increment;
            var elements=[$('#login-button')];
            elements.map(function(element){
                $(element).removeClass('active');
            })
            if(keys.main_area<0)
                keys.main_area=elements.length-1;
            if(keys.main_area>=elements.length)
                keys.main_area=0;
            $(elements[keys.main_area]).addClass('active');
        }
    },
    handleMenuLeftRight:function(increment){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "network_issue_btn":
                keys.network_issue_btn+=increment;
                if(keys.network_issue_btn<0)
                    keys.network_issue_btn=0;
                if(keys.network_issue_btn>=this.network_issue_btns.length)
                    keys.network_issue_btn=this.network_issue_btns.length-1;
                this.hoverNetworkIssueBtn(keys.network_issue_btn);
                break;
            case "expired_issue_btn":
                keys.expired_issue_btn+=increment;
                if(keys.expired_issue_btn<0)
                    keys.expired_issue_btn=0;
                if(keys.expired_issue_btn>1)
                    keys.expired_issue_btn=1;
                this.hoverExpiredIssueBtn(keys.expired_issue_btn);
                break;
            case "no_playlist_btn":
                keys.no_playlist_btn+=increment;
                if(keys.no_playlist_btn<0)
                    keys.no_playlist_btn=0;
                if(keys.no_playlist_btn>1)
                    keys.no_playlist_btn=1;
                this.hoverNoPlaylistBtn(keys.no_playlist_btn);
                break;
            case "playlist_error_btn":
                console.log('=== Playlist error button navigation ===');
                console.log('Increment:', increment);
                console.log('Current index before:', keys.playlist_error_btn);
                
                // Update button references to get current visible buttons
                this.playlist_error_btn_doms = $('.playlist-error-btn:visible');
                console.log('Available buttons:', this.playlist_error_btn_doms.length);
                console.log('Button texts:', this.playlist_error_btn_doms.map(function() { return $(this).text().trim(); }).get());
                
                keys.playlist_error_btn += increment;
                console.log('Index after increment:', keys.playlist_error_btn);
                
                // Boundary checks with proper wrapping (like terms modal)
                if(keys.playlist_error_btn < 0) {
                    keys.playlist_error_btn = this.playlist_error_btn_doms.length - 1;
                    console.log('Wrapped to max:', keys.playlist_error_btn);
                }
                if(keys.playlist_error_btn >= this.playlist_error_btn_doms.length) {
                    keys.playlist_error_btn = 0;
                    console.log('Wrapped to 0');
                }
                
                console.log('Final index:', keys.playlist_error_btn);
                this.hoverPlaylistErrorBtn(keys.playlist_error_btn);
                break;
        }
    },
    HandleKey:function(e) {
        // Multiple checks to ensure modal is properly detected
        var isModalOpen = $('#playlist-error-modal').hasClass('show') || 
                         $('#playlist-error-modal').is(':visible') ||
                         this.keys.focused_part === 'playlist_error_btn';
        
        console.log('=== HandleKey Debug ===');
        console.log('Key pressed:', e.keyCode);
        console.log('Modal hasClass show:', $('#playlist-error-modal').hasClass('show'));
        console.log('Modal is visible:', $('#playlist-error-modal').is(':visible'));
        console.log('Modal display:', $('#playlist-error-modal').css('display'));
        console.log('Current focused_part:', this.keys.focused_part);
        console.log('Final isModalOpen:', isModalOpen);

        // Force modal state if any modal is visible
        if($('#playlist-error-modal').is(':visible') || $('#playlist-error-modal').hasClass('show')) {
            console.log('=== FORCING MODAL STATE - Modal is visible ===');
            this.keys.focused_part = 'playlist_error_btn';
            isModalOpen = true;
        }

        if(isModalOpen) {
            console.log('=== Modal is open - handling key and preventing default ===');
            
            // CRITICAL: Prevent all default behavior and stop propagation immediately
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Handle keys for playlist error modal (same pattern as terms modal)
            switch(e.keyCode) {
                case tvKey.RIGHT:
                case 39: // Right arrow key code
                    console.log('RIGHT key pressed in modal');
                    this.handleMenuLeftRight(1);
                    return false;
                case tvKey.LEFT:
                case 37: // Left arrow key code
                    console.log('LEFT key pressed in modal');
                    this.handleMenuLeftRight(-1);
                    return false;
                case tvKey.DOWN:
                case 40: // Down arrow key code
                    console.log('DOWN key pressed in modal (treating as RIGHT)');
                    // In playlist error modal, treat DOWN as RIGHT movement
                    this.handleMenuLeftRight(1);
                    return false;
                case tvKey.UP:
                case 38: // Up arrow key code
                    console.log('UP key pressed in modal (treating as LEFT)');
                    // In playlist error modal, treat UP as LEFT movement
                    this.handleMenuLeftRight(-1);
                    return false;
                case tvKey.ENTER:
                case 13: // Enter key code
                    console.log('ENTER key pressed in modal');
                    this.handleMenuClick();
                    return false;
                case tvKey.RETURN:
                case 8: // Backspace key code
                case 27: // Escape key code
                    console.log('RETURN key pressed in modal');
                    this.closePlaylistErrorModal();
                    return false;
                default:
                    console.log('Unhandled key in modal:', e.keyCode);
                    return false; // Block all other keys when modal is open
            }
        } else {
            console.log('=== Modal not open - normal key handling ===');
        }

        if(e.keyCode===tvKey.RETURN){
            this.goBack();
            return;
        }
        if(this.is_loading)
            return;
        switch(e.keyCode){
            case tvKey.DOWN:
                this.handleMenuUpDown(1);
                break;
            case tvKey.UP:
                this.handleMenuUpDown(-1);
                break;
            case tvKey.LEFT:
                this.handleMenuLeftRight(-1);
                break;
            case tvKey.RIGHT:
                this.handleMenuLeftRight(1);
                break;
            case tvKey.ENTER:
                this.handleMenuClick();
                break;
            case tvKey.RETURN:
                this.goBack();
                break;
        }
    }
}