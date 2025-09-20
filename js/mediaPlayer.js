"use strict";
var media_player;
function initPlayer() {
    if(platform==='samsung'){
        media_player={
            videoObj:null,
            parent_id:'',
            STATES:{
                STOPPED: 0,
                PLAYING: 1,
                PAUSED: 2,
                PREPARED: 4
            },
            current_time:0,
            full_screen_state:0,
            init:function(id, parent_id) {
                this.videoObj=null;     // tag video
                this.parent_id=parent_id;
                this.state = this.STATES.STOPPED;
                this.parent_id=parent_id;
                this.current_time=0;
                this.videoObj = document.getElementById(id);
                // Load saved aspect ratio preference for Samsung - default to 16:9 mode (0)
                var saved_samsung_mode = localStorage.getItem('samsung_aspect_ratio_mode');
                this.full_screen_state = saved_samsung_mode ? parseInt(saved_samsung_mode) : 0;
                try{
                    // Set initial display mode based on preference - default to 16:9 letterbox
                    if(this.full_screen_state === 0) {
                        webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX');
                    } else if(this.full_screen_state === 1) {
                        webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO');
                    } else {
                        webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN');
                    }
                }catch (e) {
                }
                $('.video-resolution').text('');
                $('#'+this.parent_id).find('.subtitle-container').html("");
                $('#'+this.parent_id).find('.subtitle-container').show();
            },
            playAsync:function(url){
                $('#'+this.parent_id).find('.video-error').hide();
                $('.video-loader').show();
                if (this.state > this.STATES.STOPPED) {
                    return;
                }
                if (!this.videoObj) {
                    return 0;
                }
                try{
                    console.log(url);
                    webapis.avplay.open(url);
                    this.setupEventListeners();
                    this.setDisplayArea();
                    // webapis.avplay.setBufferingParam("PLAYER_BUFFER_FOR_PLAY","PLAYER_BUFFER_SIZE_IN_BYTE", 1000); // 5 is in seconds
                    webapis.avplay.setBufferingParam("PLAYER_BUFFER_FOR_PLAY","PLAYER_BUFFER_SIZE_IN_SECOND", 4); // 5 is in seconds
                    var that=this;
                    webapis.avplay.prepareAsync(
                        function(){
                            $('.video-loader').hide();
                            that.state = that.STATES.PLAYING;
                            webapis.avplay.play();
                            try{
                                // Maintain the user's chosen aspect ratio mode - don't override it
                                if(that.full_screen_state === 0) {
                                    webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX');
                                } else if(that.full_screen_state === 1) {
                                    webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO');
                                } else {
                                    webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN');
                                }
                            }catch (e) {
                            }
                            $('#'+that.parent_id).find('.video-total-time').text(that.formatTime(webapis.avplay.getDuration()/1000));
                            $('#'+that.parent_id).find('.video-error').hide();
                            var attributes={
                                min: 0,
                                max:webapis.avplay.getDuration()/1000
                            };
                            $('#'+that.parent_id).find('.video-progress-bar-slider').attr(attributes)
                            $('#'+that.parent_id).find('.video-progress-bar-slider').rangeslider('update', true);
                            $('#'+that.parent_id).find('.video-current-time').text("00:00");
                            if(current_route==='vod-series-player-video')
                                vod_series_player_page.showResumeBar();
                            try{
                                var video_info=webapis.avplay.getCurrentStreamInfo();
                                for(var i=0;i<video_info.length;i++){
                                    if(video_info[i].type==='VIDEO'){
                                        var extra_info=JSON.parse(video_info[i].extra_info);
                                        if(extra_info.Width && extra_info.Height)
                                        {
                                            var screen_resolution = extra_info.Width + ' x ' + extra_info.Height + ' px';
                                            $('.video-resolution').text(screen_resolution);
                                        }
                                        break;
                                    }
                                }
                            }catch (e) {
                            }
                        },
                        function(){
                            $('.video-loader').hide();
                            $('#'+that.parent_id).find('.video-error').show();
                        }
                    );
                }catch(e){
                    $('.video-loader').hide();
                    $('#'+this.parent_id).find('.video-error').show();
                }
            },
            play:function(){
                this.state=this.STATES.PLAYING;
                try{
                    webapis.avplay.play();
                }catch(e){
                    if(typeof env !== 'undefined' && env === 'develop') {
                        console.log('=== SAMSUNG PLAY FALLBACK ===');
                    }
                    this.current_time = 0;
                }
            },
            pause:function() {
                // if (this.state != this.STATES.PLAYING) {
                //     return;
                // }
                this.state = this.STATES.PAUSED;
                try{
                    webapis.avplay.pause();
                }catch(e){
                }
            },
            stop:function() {
                this.state = this.STATES.STOPPED;
                try {
                    webapis.avplay.stop();
                } catch(e) {
                    if(typeof env !== 'undefined' && env === 'develop') {
                        console.log('webapis.avplay.stop() failed:', e.message);
                    }
                }
                // Clean up fallback timer
                if (this.fallbackTimer) {
                    clearInterval(this.fallbackTimer);
                    this.fallbackTimer = null;
                    if(typeof env !== 'undefined' && env === 'develop') {
                        console.log('Fallback timer stopped and cleaned up');
                    }
                }
            },
            close:function(){
                this.state = this.STATES.STOPPED;
                try {
                    webapis.avplay.close();
                } catch(e) {
                    if(typeof env !== 'undefined' && env === 'develop') {
                        console.log('webapis.avplay.close() failed:', e.message);
                    }
                }
                // Clean up fallback timer
                if (this.fallbackTimer) {
                    clearInterval(this.fallbackTimer);
                    this.fallbackTimer = null;
                    if(typeof env !== 'undefined' && env === 'develop') {
                        console.log('Fallback timer closed and cleaned up');
                    }
                }
            },
            toggleScreenRatio:function(){
                // Cycle through Samsung display modes: 16:9 -> Auto Aspect -> Full Screen -> 16:9
                this.full_screen_state = (this.full_screen_state + 1) % 3;
                
                try{
                    if(this.full_screen_state === 0) {
                        // 16:9 aspect ratio mode - use letterbox with proper display
                        webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX');
                    } else if(this.full_screen_state === 1) {
                        // Auto aspect ratio mode
                        webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO');
                    } else {
                        // Full screen mode
                        webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN');
                    }
                }catch (e) {
                    console.log('Samsung display method error:', e);
                }
                
                // Save Samsung aspect ratio preference
                localStorage.setItem('samsung_aspect_ratio_mode', this.full_screen_state.toString());
                
                // Show user feedback about current mode
                var mode_names = ['16:9 Widescreen', 'Auto Aspect Ratio', 'Full Screen'];
                var current_mode = mode_names[this.full_screen_state];
                if(typeof showToast === 'function') {
                    showToast("Display Mode", current_mode);
                }
                
                if(typeof env !== 'undefined' && env === 'develop') {
                    console.log('=== SAMSUNG DISPLAY MODE CHANGED ===');
                    console.log('New mode:', current_mode);
                    console.log('Mode index:', this.full_screen_state);
                }
            },
            setDisplayArea:function() {
                var top_position=$(this.videoObj).offset().top;
                var left_position=$(this.videoObj).offset().left;
                var width=parseInt($(this.videoObj).width())
                var height=parseInt($(this.videoObj).height());
                webapis.avplay.setDisplayRect(left_position,top_position,width,height);
            },
            formatTime:function(seconds) {
                var hh = Math.floor(seconds / 3600),
                    mm = Math.floor(seconds / 60) % 60,
                    ss = Math.floor(seconds) % 60;
                return (hh ? (hh < 10 ? "0" : "") + hh + ":" : "") +
                    ((mm < 10) ? "0" : "") + mm + ":" +
                    ((ss < 10) ? "0" : "") + ss;
            },
            setupEventListeners:function() {
                var that = this;
                var listener = {
                    onbufferingstart: function() {
                        $('#'+that.parent_id).find('.video-loader').show();
                        $('#'+that.parent_id).find('.video-resolution').hide();
                    },
                    onbufferingprogress: function(percent) {
                        // console.log("Buffering progress: "+percent);
                    },
                    onbufferingcomplete: function() {
                        // console.log('Buffering Complete, Can play now!');
                        $('#'+that.parent_id).find('.video-loader').hide();
                        $('#'+that.parent_id).find('.video-resolution').show();
                    },
                    onstreamcompleted: function() {
                        // console.log('video has ended.');
                        $('#'+that.parent_id).find('.video-error').hide();
                        webapis.avplay.stop();
                        that.state = that.STATES.STOPPED;
                        // document.getElementById('progress-amount').style.width = "100%";
                        $('#'+that.parent_id).find('.progress-amount').css({width:'100%'})
                        if(current_route==='vod-series-player-video')
                            vod_series_player_page.showNextVideo(1);

                    },
                    oncurrentplaytime: function(currentTime) {
                        that.current_time=currentTime;
                        $('#'+that.parent_id).find('.video-error').hide();
                        
                        if(current_route==='vod-series-player-video')
                            vod_series_player_page.current_time=currentTime/1000;
                        var duration =  webapis.avplay.getDuration();
                        if (duration > 0) {
                            $('#'+that.parent_id).find('.video-progress-bar-slider').val(currentTime/1000).change();
                            $('#'+that.parent_id).find('.video-current-time').html(that.formatTime(currentTime/1000));
                            $('#'+that.parent_id).find('.video-progress-bar-slider').val(currentTime/1000).change();
                            
                            // Connect subtitle timing updates for Samsung
                            if(typeof env !== 'undefined' && env === 'develop') {
                                // Only log every 5 seconds to avoid spam
                                if(Math.floor(currentTime/1000) % 5 === 0 && Math.floor(currentTime) % 1000 < 50) {
                                    console.log('Current time (seconds):', currentTime/1000);
                                    console.log('SrtOperation exists:', typeof SrtOperation !== 'undefined');
                                    console.log('SrtOperation.stopped:', typeof SrtOperation !== 'undefined' ? SrtOperation.stopped : 'undefined');
                                }
                            }
                            
                            if (typeof SrtOperation !== 'undefined' && !SrtOperation.stopped) {
                                SrtOperation.timeChange(currentTime/1000); // Convert ms to seconds
                            } else if(typeof env !== 'undefined' && env === 'develop') {
                                // Only log every 5 seconds to avoid spam
                                if(Math.floor(currentTime/1000) % 5 === 0 && Math.floor(currentTime) % 1000 < 50) {
                                }
                            }
                        }
                    },
                    ondrmevent: function(drmEvent, drmData) {
                        // console.log("DRM callback: " + drmEvent + ", data: " + drmData);
                    },
                    onerror : function(type, data) {
                        $('#'+that.parent_id).find('.video-error').show();
                        // console.log("OnError: " + data);
                    },
                    onsubtitlechange: function(duration, text, data3, data4) {
                        $('#'+that.parent_id).find('.subtitle-container').html(text);
                        // console.log("subtitleText: ",text,data3,data4);
                    }
                }
                
                // Add fallback timing system when webapis are not available
                try {
                    webapis.avplay.setListener(listener);
                    if(typeof env !== 'undefined' && env === 'develop') {
                        console.log('Samsung webapis.avplay.setListener successfully set');
                    }
                } catch (e) {
                    if(typeof env !== 'undefined' && env === 'develop') {
                        console.log('=== SAMSUNG WEBAPIS NOT AVAILABLE ===');
                        console.log('Error:', e.message);
                    }
                    
                    // Create fallback timer for subtitle timing when webapis aren't available
                    this.fallbackTimer = setInterval(function() {
                        if (that.state === that.STATES.PLAYING) {
                            // Simulate currentTime progression 
                            that.current_time += 1000; // Add 1 second in milliseconds
                            var currentTimeSeconds = that.current_time / 1000;
                            
                            if(typeof env !== 'undefined' && env === 'develop') {
                                console.log('Simulated time (seconds):', currentTimeSeconds);
                            }
                            
                            // Update UI progress
                            if(current_route==='vod-series-player-video') {
                                vod_series_player_page.current_time = currentTimeSeconds;
                            }
                            
                            // Connect subtitle timing updates via fallback system
                            if (typeof SrtOperation !== 'undefined' && !SrtOperation.stopped) {
                                SrtOperation.timeChange(currentTimeSeconds);
                                if(typeof env !== 'undefined' && env === 'develop') {
                                    console.log('SrtOperation.timeChange called with (seconds):', currentTimeSeconds);
                                }
                            }
                        }
                    }, 1000); // Update every second
                }
            },
            onDeviceReady:function() {
                document.addEventListener('pause', this.onPause);
                document.addEventListener('resume', this.onResume);
            },
            onPause:function() {
                this.pause();
            },
            onResume:function() {
                this.play();
            },
            getSubtitleOrAudioTrack:function(kind){
                var result=[];
                if(env==='develop'){
                    result=[
                        {
                            extra_info:{
                                fourCC: "un",
                                subtitle_type: "0",
                                track_lang: "un",
                                index: 3,
                                type: "TEXT"
                            }
                        }
                    ]
                    return result;
                }
                var all_track_str="";
                var key=kind==="TEXT" ? "track_lang" : "language";
                var default_track_text=kind==="TEXT" ? "Subtitle " : "Track ";
                try{
                    var totalTrackInfo=webapis.avplay.getTotalTrackInfo();
                    for(var i=0; i<totalTrackInfo.length;i++)
                    {
                        try{
                            if(totalTrackInfo[i].type == kind){
                                var extra_info=JSON.parse(totalTrackInfo[i].extra_info);
                                if(kind==='TEXT' || kind==='AUDIO'){
                                    var language=extra_info[key].trim();
                                    if(!all_track_str.includes(language) && language!==''){
                                        all_track_str+=(", "+language);
                                        extra_info[key]=typeof language_codes[language]!="undefined" ? language_codes[language] : language;
                                        totalTrackInfo[i].extra_info=extra_info;
                                        result.push(totalTrackInfo[i]);
                                    }
                                    else if(language===''){
                                        extra_info[key]=default_track_text+(i+1);
                                        totalTrackInfo[i].extra_info=extra_info;
                                        result.push(totalTrackInfo[i]);
                                    }
                                }else{
                                    totalTrackInfo[i].extra_info=extra_info;
                                    result.push(totalTrackInfo[i]);
                                }
                            }
                        }catch (e) {
                            console.log(kind, e);
                        }
                    }
                    // console.log(kind, result);
                }catch (e) {

                }
                return result;
            },
            setSubtitleOrAudioTrack:function(kind, index){
                
                // Validate index parameter to prevent TypeMismatchError
                if (typeof index === 'undefined' || index === null) {
                    return;
                }
                
                try{
                    // Ensure subtitle container is visible for Samsung platform (subtitle only)
                    if(kind === 'TEXT') {
                        $('#'+this.parent_id).find('.subtitle-container').show();
                    }
                    
                    
                    webapis.avplay.setSelectTrack(kind, index);
                    
                }catch (e) {
                }
                if(kind==='TEXT' && index==-1)
                    $('#'+this.parent_id+' .subtitle-container').hide();
            }
        }
    }
    else if(platform==='lg'){
        media_player={
            id:'',
            videoObj:null,
            parent_id:'',
            current_time:0,
            aspect_ratio_mode:0, // 0 = 16:9 (default), 1 = contain (letterbox), 2 = fill (stretch), 3 = cover (crop)
            STATES:{
                STOPPED: 0,
                PLAYING: 1,
                PAUSED: 2,
                PREPARED: 4
            },
            ASPECT_MODES:{
                RATIO_16_9: 0,  // Force 16:9 aspect ratio (default)
                CONTAIN: 1,     // Maintain aspect ratio with letterboxing
                FILL: 2,        // Stretch to fill (may distort)
                COVER: 3        // Crop to fill while maintaining aspect ratio
            },
            subtitles:[],
            tracks:[],
            init:function(id, parent_id) {
                if(!id.includes('-lg'))
                    id+='-lg';
                this.id=id;
                this.videoObj=null;     // tag video
                this.parent_id=parent_id;
                this.current_time=0;
                // Load saved aspect ratio preference or default to 16:9 mode
                var saved_aspect_mode = localStorage.getItem('lg_aspect_ratio_mode');
                this.aspect_ratio_mode = saved_aspect_mode ? parseInt(saved_aspect_mode) : 0;

                SrtOperation.deStruct();
                $('.video-resolution').text('');
                this.state = this.STATES.STOPPED;
                this.videoObj = document.getElementById(id);
                
                // Set initial aspect ratio styling
                this.setVideoAspectRatio();
                var  videoObj=this.videoObj;
                $('#'+this.parent_id).find('.video-error').hide();
                var  that=this;
                this.videoObj.addEventListener("error", function(e) {
                    console.log("Error");
                    $('#'+that.parent_id).find('.video-error').show();
                    $('#'+that.parent_id).find('.video-loader').hide();
                });
                this.videoObj.addEventListener("canplay", function(e) {
                    $('#'+that.parent_id).find('.video-error').hide();
                });
                this.videoObj.addEventListener('durationchange', function(event){
                    // $('#'+that.parent_id).find('.video-error').hide();
                });
                this.videoObj.addEventListener('loadeddata', function(event){
                    var  duration=parseInt(videoObj.duration);
                    var attributes={
                        min: 0,
                        max:duration,
                    };
                    $('#'+that.parent_id).find('.video-progress-bar-slider').attr(attributes);
                    $('#'+that.parent_id).find('.video-progress-bar-slider').rangeslider('update', true);
                    $('#'+that.parent_id).find('.video-total-time').text(that.formatTime(duration));
                    if(current_route==='vod-series-player-video'){
                        vod_series_player_page.showResumeBar();
                    }
                    $('#'+that.parent_id).find('.video-loader').hide();
                });

                this.videoObj.ontimeupdate = function(event){
                    // $('#'+that.parent_id).find('.video-error').hide();

                    var duration = that.videoObj.duration;
                    var  currentTime=that.videoObj.currentTime;
                    if(current_route==='vod-series-player-video') {
                        SrtOperation.timeChange(videoObj.currentTime);
                        vod_series_player_page.current_time=currentTime;
                    }
                    if (duration > 0) {
                        $('#'+that.parent_id).find('.video-progress-bar-slider').val(currentTime).change();
                        $('#'+that.parent_id).find('.video-current-time').html(that.formatTime(currentTime));
                    }
                };
                this.videoObj.addEventListener('loadedmetadata', function() {
                    //     var  duration=parseInt(videoObj.duration);
                    //     $('#'+that.parent_id).find('.video-total-time').text(that.formatTime(duration));
                    var resolution='No Information';
                    try{
                        var video_width=that.videoObj.videoWidth;
                        var video_height=that.videoObj.videoHeight;
                        if(video_width && video_height)
                            resolution=video_width+' x '+video_height+'px'
                    }catch (e){
                        console.log(e);
                    }
                    console.log(resolution);
                    $('.video-resolution').text(resolution);
                });
                this.videoObj.addEventListener('waiting', function(event){
                    // console.log('Video is waiting for more data.',event);
                });
                this.videoObj.addEventListener('suspend', function(event){
                    // $('#'+that.parent_id).find('.video-error').show();
                });
                this.videoObj.addEventListener('stalled', function(event){
                    // $('#'+that.parent_id).find('.video-error').show();
                    console.log('Failed to fetch data, but trying.');
                });
                this.videoObj.addEventListener('ended', function(event){
                    if(current_route==='vod-series-player-video')
                        vod_series_player_page.showNextVideo(1);
                });
                this.videoObj.addEventListener('emptied', function(event){
                    // console.log("Empty");
                    // $('#'+that.parent_id).find('.video-error').show();
                });
            },
            playAsync:function(url){
                try{
                    this.videoObj.pause();
                }catch (e) {
                }
                console.log(url);
                var  that=this;
                $('#'+that.parent_id).find('.video-loader').show();
                $('#'+this.parent_id).find('.video-error').hide();
                while (this.videoObj.firstChild)
                    this.videoObj.removeChild(this.videoObj.firstChild);
                this.videoObj.load();
                var source = document.createElement("source");
                source.setAttribute('src',url);
                this.videoObj.appendChild(source);
                this.videoObj.play();
                $('#'+this.parent_id).find('.progress-amount').css({width:0})

                source.addEventListener("error", function(e) {
                    $('#'+that.parent_id).find('.video-error').show();
                    $('#'+that.parent_id).find('.video-loader').hide();
                });
                source.addEventListener('emptied', function(event){
                    console.log("Empty");
                    $('#'+that.parent_id).find('.video-loader').hide();
                    $('#'+that.parent_id).find('.video-error').show();
                });
                this.state=this.STATES.PLAYING;
            },
            play:function(){
                this.state=this.STATES.PLAYING;
                try{
                    this.videoObj.play();
                }catch (e) {
                }
                if(SrtOperation.srt.length>0)  // if has subtitles
                    SrtOperation.stopped=false;
            },
            setDisplayArea:function() {
            },
            pause:function() {
                this.state = this.STATES.PAUSED;
                try{
                    this.videoObj.pause();
                }catch (e) {
                }
            },
            close:function(){
                try{
                    this.videoObj.pause();
                }catch (e) {
                }
                this.state=this.STATES.STOPPED;
                SrtOperation.deStruct();
                this.subtitles=[];
            },
            formatTime:function(seconds) {
                var hh = Math.floor(seconds / 3600),
                    mm = Math.floor(seconds / 60) % 60,
                    ss = Math.floor(seconds) % 60;
                return (hh ? (hh < 10 ? "0" : "") + hh + ":" : "") +
                    ((mm < 10) ? "0" : "") + mm + ":" +
                    ((ss < 10) ? "0" : "") + ss;
            },
            seekTo:function(seekTime){

            },
            getSubtitleOrAudioTrack:function(kind){
                var totalTrackInfo = [];
                var list = kind === 'TEXT' ? this.videoObj.textTracks : this.videoObj.audioTracks;
                
                if (!list) return totalTrackInfo;
                
                // Handle AudioTrackList/TextTrackList (has length property) or generic objects
                if (typeof list.length === 'number') {
                    // AudioTrackList/TextTrackList - use length-based iteration
                    for (var i = 0; i < list.length; i++) {
                        if (list[i]) totalTrackInfo.push(list[i]);
                    }
                } else {
                    // Fallback for object-like collections - use keys
                    Object.keys(list).forEach(function(key) {
                        if (list[key] && typeof list[key] === 'object') {
                            totalTrackInfo.push(list[key]);
                        }
                    });
                }
                
                return totalTrackInfo;
            },
            setSubtitleOrAudioTrack:function(kind, index){
                if(kind==='TEXT'){
                    if(this.subtitles[index])
                        SrtOperation.init(this.subtitles[index],media_player.videoObj.currentTime);
                }else{
                    // Original working audio track logic for LG
                    if (this.videoObj.audioTracks && typeof this.videoObj.audioTracks.length === 'number') {
                        // Disable all audio tracks first
                        for (var i = 0; i < this.videoObj.audioTracks.length; i++) {
                            this.videoObj.audioTracks[i].enabled = false;
                        }
                        // Enable the selected track
                        if (this.videoObj.audioTracks[index]) {
                            this.videoObj.audioTracks[index].enabled = true;
                        }
                    }
                }
            },
            toggleScreenRatio:function(){
                // Cycle through aspect ratio modes: 16:9 -> contain -> fill -> cover -> 16:9
                this.aspect_ratio_mode = (this.aspect_ratio_mode + 1) % 4;
                this.setVideoAspectRatio();
                
                // Save preference to localStorage
                localStorage.setItem('lg_aspect_ratio_mode', this.aspect_ratio_mode.toString());
                
                // Show user feedback about current mode
                var mode_names = ['16:9 Widescreen', 'Letterbox (Contain)', 'Stretch to Fill', 'Crop to Fill (Cover)'];
                var current_mode = mode_names[this.aspect_ratio_mode];
                if(typeof showToast === 'function') {
                    showToast("Aspect Ratio", current_mode);
                }
                
                if(typeof env !== 'undefined' && env === 'develop') {
                    console.log('=== LG ASPECT RATIO CHANGED ===');
                    console.log('New mode:', current_mode);
                    console.log('Mode index:', this.aspect_ratio_mode);
                }
            },
            setVideoAspectRatio:function(){
                if(!this.videoObj) return;
                
                if(this.aspect_ratio_mode === 0) {
                    // 16:9 mode - force aspect ratio
                    this.videoObj.style.objectFit = 'fill';
                    this.videoObj.style.aspectRatio = '16/9';
                    this.videoObj.style.objectPosition = 'center';
                    this.videoObj.style.width = '100%';
                    this.videoObj.style.height = 'auto';
                } else {
                    // Other modes - use standard object-fit values
                    var object_fit_values = ['16/9', 'contain', 'fill', 'cover'];
                    var current_fit = object_fit_values[this.aspect_ratio_mode];
                    
                    this.videoObj.style.objectFit = current_fit;
                    this.videoObj.style.aspectRatio = 'auto';
                    this.videoObj.style.objectPosition = 'center';
                    this.videoObj.style.width = '100%';
                    this.videoObj.style.height = '100%';
                }
                
                if(typeof env !== 'undefined' && env === 'develop') {
                    console.log('=== LG VIDEO ASPECT RATIO SET ===');
                    console.log('Mode index:', this.aspect_ratio_mode);
                    console.log('Applied styling for mode');
                }
            }
        }
    }
}