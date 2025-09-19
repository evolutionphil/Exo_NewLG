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
                // Load saved aspect ratio preference for Samsung
                var saved_samsung_mode = localStorage.getItem('samsung_aspect_ratio_mode');
                this.full_screen_state = saved_samsung_mode ? parseInt(saved_samsung_mode) : 0;
                try{
                    webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO');
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
                                that.full_screen_state=0;
                                webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO');
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
                webapis.avplay.stop();
            },
            close:function(){
                this.state = this.STATES.STOPPED;
                webapis.avplay.close();
            },
            toggleScreenRatio:function(){
                if(this.full_screen_state==1){
                    try{
                        webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO');
                        this.full_screen_state=0;
                    }catch (e) {
                    }
                }else{
                    try{
                        webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN');
                        this.full_screen_state=1;
                    }catch (e) {
                    }
                }
                
                // Save Samsung aspect ratio preference
                localStorage.setItem('samsung_aspect_ratio_mode', this.full_screen_state.toString());
                
                // Show user feedback about current mode
                var mode_names = ['Auto Aspect Ratio', 'Full Screen'];
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
                        
                        // Gate heavy debug logging behind development environment check
                        if(typeof env !== 'undefined' && env === 'develop') {
                            console.log('=== SAMSUNG TIMING DEBUG ===');
                            console.log('Current time (ms):', currentTime);
                            console.log('Current time (seconds):', currentTime/1000);
                            console.log('SrtOperation exists:', typeof SrtOperation !== 'undefined');
                            console.log('SrtOperation stopped:', SrtOperation.stopped);
                        }
                        
                        if(current_route==='vod-series-player-video')
                            vod_series_player_page.current_time=currentTime/1000;
                        var duration =  webapis.avplay.getDuration();
                        if (duration > 0) {
                            $('#'+that.parent_id).find('.video-progress-bar-slider').val(currentTime/1000).change();
                            $('#'+that.parent_id).find('.video-current-time').html(that.formatTime(currentTime/1000));
                            $('#'+that.parent_id).find('.video-progress-bar-slider').val(currentTime/1000).change();
                            
                            // Connect subtitle timing updates for Samsung
                            if (typeof SrtOperation !== 'undefined' && !SrtOperation.stopped) {
                                SrtOperation.timeChange(currentTime/1000); // Convert ms to seconds
                                if(typeof env !== 'undefined' && env === 'develop') {
                                    console.log('SrtOperation.timeChange called with (seconds):', currentTime/1000);
                                }
                            } else if(typeof env !== 'undefined' && env === 'develop') {
                                console.log('SrtOperation not available or stopped');
                            }
                        }
                        
                        if(typeof env !== 'undefined' && env === 'develop') {
                            console.log('=== END SAMSUNG TIMING DEBUG ===');
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
                webapis.avplay.setListener(listener);
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
                try{
                    $('#'+this.parent_id+' .subtitle-container').show();
                    webapis.avplay.setSelectTrack(kind,index);
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
            aspect_ratio_mode:0, // 0 = contain (letterbox), 1 = fill (stretch), 2 = cover (crop)
            STATES:{
                STOPPED: 0,
                PLAYING: 1,
                PAUSED: 2,
                PREPARED: 4
            },
            ASPECT_MODES:{
                CONTAIN: 0,  // Maintain aspect ratio with letterboxing
                FILL: 1,     // Stretch to fill (may distort)
                COVER: 2     // Crop to fill while maintaining aspect ratio
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
                // Load saved aspect ratio preference or default to contain mode
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
                var totalTrackInfo=[],temps
                if(kind=="TEXT"){
                    temps=this.videoObj.textTracks;
                }else
                    temps=this.videoObj.audioTracks;
                console.log(temps);
                if(Object.keys(temps).length>0){
                    Object.keys(temps).map(function (key,index) {
                        if(typeof temps[key]=='object' && temps[key]!=null)
                            totalTrackInfo.push(temps[key]);
                    })
                }
                console.log(totalTrackInfo);
                return totalTrackInfo;
            },
            setSubtitleOrAudioTrack:function(kind, index){
                if(kind==='TEXT'){
                    if(this.subtitles[index])
                        SrtOperation.init(this.subtitles[index],media_player.videoObj.currentTime);
                }else{
                    for (var i = 0; i < this.videoObj.audioTracks.length; i++) {
                        this.videoObj.audioTracks[i].enabled = false;
                    }
                    this.videoObj.audioTracks[index].enabled = true;
                }
            },
            toggleScreenRatio:function(){
                // Cycle through aspect ratio modes: contain -> cover -> fill -> contain
                this.aspect_ratio_mode = (this.aspect_ratio_mode + 1) % 3;
                this.setVideoAspectRatio();
                
                // Save preference to localStorage
                localStorage.setItem('lg_aspect_ratio_mode', this.aspect_ratio_mode.toString());
                
                // Show user feedback about current mode
                var mode_names = ['Letterbox (Contain)', 'Crop to Fill (Cover)', 'Stretch to Fill'];
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
                
                var object_fit_values = ['contain', 'cover', 'fill'];
                var current_fit = object_fit_values[this.aspect_ratio_mode];
                
                // Apply CSS object-fit property for proper aspect ratio control
                this.videoObj.style.objectFit = current_fit;
                this.videoObj.style.objectPosition = 'center';
                
                if(typeof env !== 'undefined' && env === 'develop') {
                    console.log('=== LG VIDEO ASPECT RATIO SET ===');
                    console.log('Applied object-fit:', current_fit);
                }
            }
        }
    }
}