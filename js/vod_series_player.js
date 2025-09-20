"use strict";
var vod_series_player_page={
    player:null,
    back_url:'vod-summary-page',
    show_control:false,
    timeOut:null,
    has_episodes:false,
    keys:{
        focused_part:"control_bar",  //operation_modal
        control_bar:0,
        info_bar:0,
        operation_modal:0,
        subtitle_audio_selection_modal:0,
        audio_selection_modal:0,
        prev_focus:'',
        resume_bar:0,
        episode_selection:0,
        subtitle_btn_selection:0
    },
    current_subtitle_index:-1,
    current_audio_track_index:-1,
    subtitle_audio_menus:[],
    forwardTimer:null,
    current_time:0,
    show_subtitle:false,
    show_audio_track:false,
    video_control_doms:$('.video-control-item'),
    video_info_doms:[],
    vod_info_timer:null,
    current_movie:{},
    resume_time:0,
    resume_timer:null,
    episode_doms:[],
    resume_bar_doms:$('#video-resume-modal .resume-action-btn'),
    seek_timer:null,
    seek_interval_timer:null,
    current_movie_type:'',
    video_duration:0,
    last_key_time:0,
    slider_element:$('#vod-series-video-progressbar-container .video-progress-bar-slider')[0],
    resume_videos_updated:false,
    subtitle_btn_doms:$('.subtitle-btn'),
    subtitle_loading:false,
    subtitle_loaded:false,
    fw_timer:null,

    // Safe wrapper for media player track access
    safeGetTracks: function(kind) {
        if(media_player && typeof media_player.getSubtitleOrAudioTrack === 'function') {
            return media_player.getSubtitleOrAudioTrack(kind);
        } else {
            return [];
        }
    },

    // Enhanced episode name parsing for subtitle fallback matching
    parseEpisodeName: function(episodeName) {
        
        var result = {
            series_name: null,
            season_number: null,
            episode_number: null,
            episode_title: null
        };
        
        if (!episodeName || typeof episodeName !== 'string') {
            return result;
        }
        
        var cleaned_name = episodeName.trim();
        
        // Step 1: Remove country/language codes (TR:, ES:, EN:, etc.)
        cleaned_name = cleaned_name.replace(/^[A-Z]{2}:\s*/i, '');
        
        // Step 2: Try to match various season/episode patterns
        var season_episode_patterns = [
            // "Series Name S01 E01" or "Series Name S01E01"
            /^(.+?)\s+S(\d{1,2})\s*E(\d{1,2})(?:\s*-\s*(.+))?$/i,
            // "Series Name Season 1 Episode 1"
            /^(.+?)\s+Season\s+(\d{1,2})\s+Episode\s+(\d{1,2})(?:\s*-\s*(.+))?$/i,
            // "Series Name 1x01" or "Series Name 1x1"
            /^(.+?)\s+(\d{1,2})x(\d{1,2})(?:\s*-\s*(.+))?$/i,
            // "Series Name (2023) S01E01"
            /^(.+?)\s*\(\d{4}\)\s*S(\d{1,2})E(\d{1,2})(?:\s*-\s*(.+))?$/i
        ];
        
        for (var i = 0; i < season_episode_patterns.length; i++) {
            var match = cleaned_name.match(season_episode_patterns[i]);
            if (match) {
                result.series_name = match[1].trim();
                result.season_number = parseInt(match[2]);
                result.episode_number = parseInt(match[3]);
                if (match[4]) {
                    result.episode_title = match[4].trim();
                }
                
                break;
            }
        }
        
        // Step 3: If no season/episode pattern found, try to extract just series name
        if (!result.series_name) {
            
            // Remove common episode indicators and clean up
            var series_only = cleaned_name
                .replace(/\s*\(.*?\)/g, '') // Remove parentheses content
                .replace(/\s*\[.*?\]/g, '') // Remove brackets content  
                .replace(/\s*\{.*?\}/g, '') // Remove curly braces content
                .replace(/\s*-\s*Episode.*$/i, '') // Remove "- Episode X" suffix
                .replace(/\s*Ep\s*\d+.*$/i, '') // Remove "Ep 1" suffix
                .replace(/\s+/g, ' ') // Normalize spaces
                .trim();
                
            if (series_only && series_only.length > 2) {
                result.series_name = series_only;
            }
        }
        
        // Step 4: Clean and normalize the series name
        if (result.series_name) {
            result.series_name = result.series_name
                .replace(/\s*\(.*?\)/g, '') // Remove remaining parentheses
                .replace(/\s*\[.*?\]/g, '') // Remove remaining brackets
                .replace(/\s*\{.*?\}/g, '') // Remove remaining braces
                .replace(/[^\w\s&'-]/g, ' ') // Keep only letters, numbers, spaces, &, apostrophes, hyphens
                .replace(/\s+/g, ' ') // Normalize multiple spaces
                .trim();
                
        }
        
        
        return result;
    },

    init:function(movie,movie_type,back_url,movie_url){
        this.resume_videos_updated=false;
        this.current_movie=movie;
        this.current_time=0;
        this.video_duration=0;
        this.subtitle_loaded=false;
        this.fw_timer=null;
        $('#vod-series-player-page').removeClass('hide');
        this.showControlBar(true);
        var element=$(this.video_control_doms[2]);
        $(element).removeClass('fa-play');
        $(element).addClass('fa-pause');
        this.hoverVideoControlIcon(2);
        $('#vod-series-player-page').find('.video-current-time').text("--:--");
        $('#vod-series-player-page').find('.video-total-time').text("--:--");

        var that=this;
        var slider_element=this.slider_element;
        $(slider_element).attr({
            min:0,
            max:100
        })
        $(slider_element).rangeslider({
            polyfill: false,
            rangeClass: 'rangeslider',
            onSlideEnd:function (position, value) {
                that.sliderPositionChanged(value);
            }
        })
        $(slider_element).val(0).change();
        // $(slider_element).attr('disabled',true);
        $(slider_element).rangeslider('update');

        clearTimeout(this.resume_timer);
        var url;
        if(movie_type==="movies"){
            if(settings.playlist_type==='xtreme')
                url=getMovieUrl(movie.stream_id,'movie',movie.container_extension);
            else if(settings.playlist_type==='type1')
                url=movie.url;
            $('#vod-series-video-title').html(movie.name);
        }
        else if(movie_type==='series'){
            if(settings.playlist_type==='xtreme')
                url=getMovieUrl(movie.id,'series',movie.container_extension)
            else if(settings.playlist_type==='type1')
                url=movie.url;
            $('#vod-series-video-title').html(movie.title);
        }
        else if(movie_type==='epg'){
            url=movie_url;
            var programme=epg_page.sorted_programmes[epg_page.keys.date_selection].programmes[epg_page.keys.programme_selection];
            var title=programme.title+"  <span class='player-epg-title-time'>"+programme.start.substr(11)+'~'+programme.stop.substr(11)+'</span>'
            $('#vod-series-video-title').html(title);
        }
        this.back_url=back_url;
        try{
            media_player.close();
        }catch(e){
        }
        try{
            media_player.init("vod-series-player-video","vod-series-player-page");
            media_player.setDisplayArea();
        }catch (e) {
        }
        try{
            media_player.playAsync(url);
        }catch (e) {
        }
        var movie_key;
        if(movie_type==='movies')
            movie_key='stream_id';
        else{
            movie_key='id';
        }
        if(movie_type==='movies' || movie_type==='series'){
            movie_key=movie[movie_key].toString();
            if(movie_type==='movies'){
                if(typeof VodModel.saved_video_times[movie_key]!='undefined'){
                    this.resume_time=VodModel.saved_video_times[movie_key];
                }else{
                    this.resume_time=0;
                }
            }
            else if(movie_type==='series'){
                if(typeof SeriesModel.saved_video_times[movie_key]!='undefined'){
                    this.resume_time=SeriesModel.saved_video_times[movie_key];
                }else{
                    this.resume_time=0;
                }
            }
        }
        else{
            this.resume_time=0;
        }
        current_route="vod-series-player-video";
        this.current_subtitle_index=-1;
        this.current_audio_track_index=-1;
        this.show_subtitle=false;
        this.current_movie_type=movie_type;
    },
    sliderPositionChanged:function(newTime){
        this.hoverSlider();
        media_player.videoObj.currentTime=newTime;
        this.current_time=newTime;
        $(this.slider_element).val(newTime).change();
        $('#'+media_player.parent_id).find('.video-current-time').html(media_player.formatTime(newTime));
    },
    makeEpisodeDoms:function(back_url){
        this.keys.episode_selection=0;
        if(back_url==='episode-page'){
            var episodes=current_season.episodes;
            this.episodes=episodes;
            this.has_episodes=true;
            var html='';
            episodes.map(function (item, index) {
                var episode_img=current_season.cover;
                if(item.info && item.info.movie_image)
                    episode_img=item.info.movie_image;
                html+=
                    '<div class="player-episode-item-container">\
                        <div class="player-episode-item border-focus"\
                            onclick="vod_series_player_page.showSelectedEpisode()"\
                            onmouseenter="vod_series_player_page.hoverEpisode('+index+')"\
                        >\
                            <img class="player-episode-item-img" src="'+episode_img+'" onerror="this.src=\'images/404.png\'">\
                            <div class="player-episode-item-bg-overlay"></div> \
                            <div class="player-episode-title-container">\
                                <div class="player-episode-title max-line-2">'+item.title+'</div>\
                            </div>\
                        </div>\
                    </div>'
            })
            $('#player-episode-items-wrapper').html(html);
            this.episode_doms=$('.player-episode-item');
            $('#player-episode-container').removeClass('expanded');
            $('#player-episode-container').show();
        }
        else{
            this.has_episodes=false;
            $('#player-episode-items-wrapper').html('');
            this.episode_doms=$('.player-episode-item')
            this.episode_doms=[];
            $('#player-episode-container').hide();
        }
    },
    showResumeBar:function(){
        var keys=this.keys;
        if(this.resume_time>0){
            if(keys.focused_part!=='resume_bar')
                keys.prev_focus=keys.focused_part;
            var milliseconds=1000;
            if(platform==='lg')
                milliseconds=1;
            var resume_time_format=media_player.formatTime(this.resume_time/milliseconds);
            $('#vod-resume-time').text(resume_time_format);
            $('#video-resume-modal').show();
            this.hideControlBar();
            clearTimeout(this.resume_timer);
            if(keys.focused_part=="subtitle_audio_selection_modal" || keys.focused_part==="subtitle_btn_selection") // if already showing subtitle modal, should not change focused part
                keys.prev_focus="resume_bar";  //
            else
                this.hoverResumeBtn(0);
        }
    },
    Exit:function(){
        this.saveVideoTime();
        current_route=this.back_url;
        try{
            media_player.close();
        }catch(e){

        }
        $('#'+media_player.parent_id).find('.video-error').hide();
        $('#'+media_player.parent_id).find('.subtitle-container').text('');
        $('#vod-series-player-page').addClass('hide');
        switch (this.back_url){
            case "vod-series-page":
                $('#vod-series-page').removeClass('hide');
                if(this.resume_videos_updated)
                    vod_series_page.rerenderResumeVideos();
                break;
            case "search-page":
                $('#search-page').show();
                break;
            case "episode-page":
                $('#series-summary-page').removeClass('hide');
                break;
        }
    },
    saveVideoTime:function(){
        try{
            var current_time=1, duration=0, dt=30, min_seconds=300, keys;
            try{
                if(platform==='samsung'){
                    dt=10000;
                    current_time=webapis.avplay.getCurrentTime();
                    duration=webapis.avplay.getDuration();
                    min_seconds=5*60*1000;//5 mins
                }
                else if(platform==='lg'){
                    current_time=media_player.videoObj.currentTime;
                    duration=media_player.videoObj.duration;
                }
            }catch (e){
            }
            if(env=='develop'){
                // current_time=min_seconds+10
                // duration=min_seconds+dt+20;
            }
            var movie=this.current_movie;
            if(duration-current_time>=dt && current_time>=min_seconds){
                if(this.current_movie_type==='movies'){
                    var is_added=VodModel.saveVideoTime(movie.stream_id,current_time);
                    if(is_added){
                        if(!checkForAdult(movie,'movie',VodModel.categories)){
                            VodModel.addRecentOrFavouriteMovie(movie,'recent');  // Add To Recent Movies
                            if(this.back_url==='vod-series-page'){ // show eye icon for resume
                                keys=vod_series_page.keys;
                                $(vod_series_page.menu_doms[keys.menu_selection]).find('.vod-series-watch-icon').addClass('resume');
                            }else if(this.back_url==='search-page'){
                                keys=search_page.keys;
                                $(search_page.movie_doms[1][keys.hor_keys[1]]).find('.vod-series-watch-icon').addClass('resume');
                            }
                        }
                    }
                }
                if(this.current_movie_type==='series')
                    SeriesModel.saveVideoTime(movie.id,current_time);
            }
            else{
                if(this.current_movie_type==='movies'){
                    var is_removed=VodModel.removeVideoTime(movie.stream_id);
                    if(is_removed){
                        VodModel.removeRecentOrFavouriteMovie(movie.stream_id,'recent');
                        if(this.back_url==='vod-series-page'){
                            var category=vod_series_page.categories[vod_series_page.keys.category_selection];
                            keys=vod_series_page.keys;
                            var menu_doms=vod_series_page.menu_doms
                            if(category.category_id==='recent'){  // if it is resume category, remove movie item from dom
                                this.resume_videos_updated=true;
                            }else {
                                $(menu_doms[keys.menu_selection]).find('.vod-series-watch-icon').removeClass('resume');
                            }
                        }else if(this.back_url==='search-page'){
                            keys=search_page.keys;
                            $(search_page.movie_doms[1][keys.hor_keys[1]]).find('.vod-series-watch-icon').removeClass('resume');
                        }
                    }
                }
                if(this.current_movie_type==='series')
                    SeriesModel.removeVideoTime(movie.id);
            }
        }catch (e) {
                    }
    },
    goBack:function(){
        $('.modal').modal('hide');
        var keys=this.keys;
        if(this.show_control){
            this.hideControlBar();
        }else{
            if(keys.focused_part==="control_bar" || keys.focused_part==='info_bar' || keys.focused_part==='episode_selection' || keys.focused_part==='slider'){
                this.Exit();
                if(this.back_url==="vod-summary-page"){
                    current_route="vod-series-page";
                    $('#vod-series-page').removeClass('hide');
                    moveScrollPosition($('#vod-series-menus-container'), vod_series_page.menu_doms[vod_series_page.keys.menu_selection], 'vertical', false);
                }
                if(this.back_url==="episode-page"){
                    current_route="series-summary-page";
                    $('#series-summary-page').removeClass('hide');
                    var season_buttons=series_summary_page.episode_doms;
                    moveScrollPosition($('#episode-items-container'),season_buttons[series_summary_page.keys.episode_selection],'vertical',false)
                }
            }
        }
        switch (keys.focused_part){
            case "resume_bar":
                if($('#video-resume-modal').css("display")==='none'){
                    keys.focused_part='control_bar';
                    return;
                }
                $('#video-resume-modal').hide();
                if(keys.prev_focus!='resume_bar')
                    keys.focused_part=keys.prev_focus;
                else // this means, in subtitle modal, the prev focus is settled to resume bar, so in this case,
                    // have to go back to info_bar
                    keys.focused_part='control_bar'
                clearTimeout(this.resume_timer);
                break;
            case "vod_info":
                $('#vod-video-info-container').hide();
                clearTimeout(this.vod_info_timer);
                keys.focused_part=keys.prev_focus;
                break;
            case "subtitle_audio_selection_modal":
            case "subtitle_btn_selection":
                // Properly reset all subtitle-related flags when user cancels/goes back
                this.subtitle_loading=false;
                // Don't set subtitle_loaded=true here as user didn't complete the operation
                // This allows subsequent subtitle requests to work properly
                $('#subtitle-loader-container').hide();
                keys.focused_part=keys.prev_focus;
                $('#subtitle-selection-modal').modal('hide');
                
                // Clear any pending notifications or visual indicators
                var modalTitle = $('#subtitle-modal-title');
                if(modalTitle.length > 0) {
                    var titleText = modalTitle.text();
                    if(titleText.includes('(Native Only)')) {
                        modalTitle.text(titleText.replace(' (Native Only)', ''));
                    }
                }
                break;
        }
    },
    playPauseVideo:function(){
        this.showControlBar(false);
        var icons=this.video_control_doms;
        var element=$(icons[2]);
        if(media_player.state===media_player.STATES.PLAYING){
            try{
                media_player.pause();
                $(element).removeClass('fa-pause');
                $(element).addClass('fa-play');
            }catch(e){
            }
        }else if(media_player.state===media_player.STATES.PAUSED){
            try{
                media_player.play();
                $(element).removeClass('fa-play');
                $(element).addClass('fa-pause');
            }catch(e){
            }
        }
    },
    seekTo:function(step){
        if(platform==='samsung'){
            var new_key_time=new Date().getTime()/1000;
            if(new_key_time-this.last_key_time<0.1){
                return;
            }
            this.last_key_time=new_key_time;
            if(this.current_time===0)
                this.current_time=media_player.current_time/1000;
            var duration, newTime;
            if(this.video_duration!=0)
                duration=this.video_duration;
            else{
                try{
                    duration=webapis.avplay.getDuration()/1000;
                    this.video_duration=duration;
                }catch (e) {
                    duration=0;
                    this.video_duration=0;
                }
            }
            if(!duration)
                return;
            newTime = this.current_time + step;
            if(newTime<0){
                this.showNextVideo(-1);
                return;
            }
            if(newTime>=duration){
                this.showNextVideo(1);
                return;
            }
            this.current_time=newTime;
            $('#'+media_player.parent_id).find('.video-current-time').html(media_player.formatTime(newTime));
            $(this.slider_element).val(newTime).change();

            clearTimeout(this.seek_timer);
            if(media_player.state===media_player.STATES.PLAYING){
                try{
                    media_player.pause();
                }catch(e){
                }
            }
            $('#'+media_player.parent_id).find('.video-loader').show();
            this.seek_timer=setTimeout(function () {
                webapis.avplay.seekTo(newTime*1000);
                setTimeout(function () {
                    try{
                        media_player.play();
                    }catch(e){
                    }
                },200)
            },500);
        }
        else{
            if(this.current_time===0)
                this.current_time=media_player.videoObj.currentTime;
            var duration=media_player.videoObj.duration;
            var newTime = this.current_time + step;
            if(newTime<0)
                newTime=0;
            if(newTime>=duration)
                newTime=duration;
            this.current_time=newTime;
            media_player.videoObj.currentTime=newTime;
            if (duration > 0) {
                if(SrtOperation.srt && SrtOperation.srt.length>0){  // here will hide subtitles first
                    $('#'+media_player.parent_id).find('.subtitle-container').html('');
                    SrtOperation.stopOperation();
                    if(this.fw_timer){
                        clearTimeout(this.fw_timer);
                        this.fw_timer=null;
                    }
                    this.fw_timer=setTimeout(function (){
                        SrtOperation.stopped=false;
                        SrtOperation.findIndex(media_player.videoObj.currentTime,0,SrtOperation.srt.length-1);
                    },200)
                }
                $(this.slider_element).val(newTime).change();
                $('#'+media_player.parent_id).find('.video-current-time').html(media_player.formatTime(newTime));
            }
        }
    },
    showSelectedEpisode:function(){
        var episode_keys=series_summary_page.keys;
        var keys=this.keys;
        var episode_items=series_summary_page.episode_doms;
        if(episode_keys.episode_selection!=keys.episode_selection){
            $(episode_items).removeClass('active');
            episode_keys.episode_selection=keys.episode_selection;
            $(episode_items[episode_keys.episode_selection]).addClass('active');
            var episodes=this.episodes;
            var episode=episodes[keys.episode_selection];
            this.saveVideoTime();
            this.resume_time=0;
            try{
                media_player.close();
            }catch(e){
            }
            current_episode=episode;
            vod_series_player_page.init(current_episode,'series',"episode-page",'')
            this.hoverEpisode(keys.episode_selection);
        }
    },
    showNextVideo:function(increment){
        this.saveVideoTime();
        this.resume_time=0;
        switch (this.back_url) {
            case "vod-series-page":
                var menu_doms=vod_series_page.menu_doms;
                var keys=vod_series_page.keys;
                keys.menu_selection+=increment;
                if(keys.menu_selection<0)
                {
                    keys.menu_selection=0;
                    return;
                }
                if(keys.menu_selection>=vod_series_page.movies.length)
                {
                    keys.menu_selection=vod_series_page.movies.length-1;
                    return;
                }
                $(menu_doms).removeClass('active');
                $(menu_doms[keys.menu_selection]).addClass('active');
                current_movie=vod_series_page.movies[keys.menu_selection];
                this.init(current_movie,"movies","vod-summary-page",'');
                break;
            case 'episode-page':
                var keys=series_summary_page.keys;
                var episode_items=series_summary_page.episode_doms;
                $(episode_items).removeClass('active');
                keys.episode_selection+=increment;
                if(keys.episode_selection<0)
                {
                    keys.episode_selection=0;
                    return;
                }
                if(keys.episode_selection>=episode_items.length){
                    keys.episode_selection=episode_items.length-1;
                    return;
                }
                $(episode_items[keys.episode_selection]).addClass('active');
                var episodes=current_season.episodes;
                current_episode=episodes[keys.episode_selection];
                vod_series_player_page.init(current_episode,'series',"episode-page",'')
                break;
            case 'search-page':
                var keys=search_page.keys;
                var key=keys.hor_keys[1];
                key+=increment;
                if(key<0)
                    return;
                if(key>=search_page.movie_doms[1].length)
                    return;
                current_movie=search_page.filtered_movies[1][key];
                search_page.keys.hor_keys[1]=key;
                this.init(current_movie,"movies","search-page");
                break;
        }
    },
    showControlBar:function(move_focus){
        $('#vod-series-video-controls-container').slideDown();
        this.show_control=true;
        var that=this;
        if(move_focus){
            this.hoverVideoControlIcon(2);
            $('#player-episode-container').removeClass('expanded');
        }
        clearTimeout(this.timeOut)
        this.timeOut=setTimeout(function(){
            that.hideControlBar();
        },10000);
    },
    hideControlBar:function(){
        $('#vod-series-video-controls-container').slideUp();
        this.show_control=false;
    },
    makeMediaTrackElement:function(items,kind){
        var htmlContent='', hover_index_move=0;
        if(kind==='TEXT'){
            hover_index_move=1;
            htmlContent=
                '<div class="setting-modal-option subtitle-item bg-focus"\
                    onmouseenter="vod_series_player_page.hoverSubtitle(0)" \
                    onclick="vod_series_player_page.handleMenuClick()" \
                >\
                   <input class="setting-modal-checkbox" type="checkbox" name="subtitle" id="disable-subtitle" value="-1">\
                   <label for="disable-subtitle">Turn Off Subtitles</label>\
                </div>';
        }
        if(platform==='samsung'){
            var language_key="track_lang";
            if(kind!=="TEXT")
                language_key="language";
            items.map(function(item, index){
                var extra_info=item.extra_info;
                var baseLanguage = extra_info[language_key];
                
                // **UI LABELING**: Add explicit source labels for user clarity
                var displayLanguage = baseLanguage;
                if(kind === "TEXT") {
                    if(item.source === 'native') {
                        displayLanguage = baseLanguage + ' (Stream)';
                    } else if(item.source === 'api') {
                        displayLanguage = baseLanguage + ' (API)';
                    } else if(item.isNative === true) {
                        // Backward compatibility for items without explicit source
                        displayLanguage = baseLanguage + ' (Stream)';
                    } else if(item.isNative === false) {
                        // Backward compatibility for items without explicit source
                        displayLanguage = baseLanguage + ' (API)';
                    }
                }
                
                // Use combinedIndex if available for robust indexing, otherwise fall back to item.index
                var indexValue = item.combinedIndex !== undefined ? item.combinedIndex : item.index;
                
                htmlContent+=
                    '<div class="setting-modal-option subtitle-item bg-focus"\
                        onmouseenter="vod_series_player_page.hoverSubtitle('+(index+hover_index_move)+')" \
                        onclick="vod_series_player_page.handleMenuClick()" \
                    >\
                        <input class="setting-modal-checkbox" type="checkbox" name="subtitle"  id="disable-subtitle"\
                            value="'+indexValue+'"\
                        >\
                        <label for="disable-subtitle">'+displayLanguage+'</label>\
                    </div>';

            })
        }else if(platform==='lg'){
            var default_track_text=kind==="TEXT" ? "Subtitle " : "Track ";
            items.map(function(item,index){
                var language;
                
                // Handle custom API subtitles (have 'label' property)
                if(item.label && item.lang) {
                    language = item.label;
                } 
                // Handle native platform subtitles (have 'language' property)
                else {
                    language = item.language;
                    if(language!=''){
                        language=typeof language_codes[language]!='undefined' ? language_codes[language] : language;
                    }else{
                        language=default_track_text+(index+1);
                    }
                }
                
                
                htmlContent+=
                    '<div class="setting-modal-option subtitle-item bg-focus"\
                        onmouseenter="vod_series_player_page.hoverSubtitle('+(index+hover_index_move)+')" \
                        onclick="vod_series_player_page.handleMenuClick()" \
                >\
                    <input class="setting-modal-checkbox" type="checkbox" name="subtitle"\
                        value="'+index+'">\
                    <label>'+language+'</label>\
                </div>'
            })
        }
        return htmlContent;
    },
    showSubtitleAudioModal:function(kind){
        
        var keys=this.keys;
        if(keys.focused_part!="subtitle_audio_selection_modal" && keys.focused_part!='subtitle_btn_selection')
            keys.prev_focus=keys.focused_part;
        this.hideControlBar();
        var subtitles
        try{
            if(platform!=='samsung' && kind==='TEXT'){  // we will use our own made subtitles
                if(!this.subtitle_loaded) {
                    $("#subtitle-selection-container").html('');
                    if(!(this.current_movie_type==='movies' || (this.current_movie_type==='series' && settings.playlist_type==='xtreme')))
                    {
                        // **CRITICAL FIX**: Check for native subtitle fallback before showing empty message
                        var nativeSubtitles = this.safeGetTracks('TEXT');
                        if (nativeSubtitles && nativeSubtitles.length > 0) {
                            // Render native subtitles
                            var htmlContent = this.renderSubtitles('TEXT', nativeSubtitles);
                            $("#subtitle-selection-container").html(htmlContent);
                            $("#subtitle-modal-title").text("Subtitles (Native Only)");
                            this.subtitle_loaded = true; // Only after rendering
                            showToast("Info", "Enhanced subtitles unavailable. Using native subtitles.");
                            this.showSubtitleAudioModal_afterLoading('TEXT');
                        } else {
                            this.showEmptySubtitleMessage(kind);
                        }
                        return;
                    }
                    var that=this;
                    this.subtitle_loading=true;
                    $('#subtitle-selection-modal').modal('show');
                    this.hoverSubtitleBtn(0);
                    $('#subtitle-loader-container').show();
                    var subtitle_request_data;
                    if(this.current_movie_type==='movies'){
                        
                        // Analyze and clean movie name for better OpenSubtitles matching
                        var original_name = this.current_movie.name;
                        var cleaned_name = original_name;
                        
                        // Extract year if present in name
                        var year_match = cleaned_name.match(/\((\d{4})\)/);
                        var extracted_year = null;
                        if (year_match) {
                            extracted_year = parseInt(year_match[1]);
                            cleaned_name = cleaned_name.replace(/\s*\(\d{4}\)\s*/, '').trim();
                        } else {
                        }
                        
                        // Remove quality indicators that might interfere with matching
                        var quality_patterns = /\s*\b(HD|4K|1080p|720p|480p|BluRay|BRRip|WEB-DL|WEBRip|DVDRip|CAMRip|TS|TC|HDTV|PDTV|XviD|x264|x265|HEVC|DivX|AC3|AAC|MP3|Dubbed|Subbed)\b\s*/gi;
                        var before_quality = cleaned_name;
                        cleaned_name = cleaned_name.replace(quality_patterns, ' ').trim();
                        cleaned_name = cleaned_name.replace(/\s+/g, ' ').trim();
                        
                        // Remove brackets content (except years)
                        var before_brackets = cleaned_name;
                        cleaned_name = cleaned_name.replace(/\[.*?\]/g, '').trim();
                        cleaned_name = cleaned_name.replace(/\{.*?\}/g, '').trim();
                        cleaned_name = cleaned_name.replace(/\s+/g, ' ').trim();
                        
                        subtitle_request_data={
                            movie_name: cleaned_name,
                            movie_type: 'movie'
                        }
                        
                        // Add TMDB ID if available (highest priority for matching)
                        if(this.current_movie.tmdb_id) {
                            subtitle_request_data.tmdb_id = this.current_movie.tmdb_id;
                        } else {
                        }
                        
                        // Add extracted or existing year for better matching
                        if(extracted_year) {
                            subtitle_request_data.year = extracted_year;
                        } else if(this.current_movie.year) {
                            subtitle_request_data.year = this.current_movie.year;
                        } else {
                        }
                        
                    } else {
                        // SERIES EPISODES: Enhanced logic with episode name parsing fallback
                        
                        // Fix: Extract episode name from correct property
                        var episode_name = this.current_movie.title || this.current_movie.name || this.current_movie.episode_name || '';
                        
                        subtitle_request_data = {
                            movie_type: 'episode'
                        }
                        
                        // Primary: Use episode TMDB ID from this.current_movie.info.tmdb_id
                        if(this.current_movie && this.current_movie.info && this.current_movie.info.tmdb_id) {
                            subtitle_request_data.tmdb_id = String(this.current_movie.info.tmdb_id);
                        } else {
                            
                            // FALLBACK: Parse episode name for series info
                            var parsed_episode = this.parseEpisodeName(episode_name);
                            
                            if(parsed_episode.series_name) {
                                // Format as single string: "the witcher s01 e01"
                                var formatted_name = parsed_episode.series_name.toLowerCase();
                                
                                if(parsed_episode.season_number && parsed_episode.episode_number) {
                                    var season_str = 's' + String(parsed_episode.season_number).padStart(2, '0');
                                    var episode_str = 'e' + String(parsed_episode.episode_number).padStart(2, '0');
                                    formatted_name = formatted_name + ' ' + season_str + ' ' + episode_str;
                                }
                                
                                subtitle_request_data.movie_name = formatted_name;
                                
                                // Use series TMDB ID if available from series info
                                if(this.current_movie.info && this.current_movie.info.tmdb_id) {
                                    subtitle_request_data.id = String(this.current_movie.info.tmdb_id);
                                }
                                
                            } else {
                                subtitle_request_data.movie_type = 'auto';
                            }
                        }
                        
                    }
                    
                    
                    $.ajax({
                        method:'post',
                        url:'https://exoapp.tv/api/get-subtitles',
                        data: subtitle_request_data,
                        dataType:'json',
                        success:function (result) {
                            that.subtitle_loading=false;
                            $('#subtitle-loader-container').hide();
                            
                            if(result.status==='success'){
                                if(result.subtitles && result.subtitles.length>0){
                                    media_player.subtitles= result.subtitles;
                                    that.renderSubtitles(kind, media_player.subtitles);
                                    that.subtitle_loaded=true; // Only set AFTER successful rendering
                                }
                                else{
                                    media_player.subtitles=[];
                                    // Check if native subtitles are available for fallback
                                    var nativeSubtitles = [];
                                    if(media_player && typeof media_player.getSubtitleOrAudioTrack === 'function') {
                                        nativeSubtitles = this.safeGetTracks('TEXT');
                                    } else {
                                    }
                                    if (nativeSubtitles && nativeSubtitles.length > 0) {
                                        // Render native subtitles as fallback
                                        var htmlContent = that.renderSubtitles('TEXT', nativeSubtitles);
                                        $("#subtitle-selection-container").html(htmlContent);
                                        $("#subtitle-modal-title").text("Subtitles (Native Only)");
                                        that.subtitle_loaded = true; // Only set AFTER successful rendering
                                        showToast("Info", "Enhanced subtitles unavailable. Using native subtitles.");
                                        that.showSubtitleAudioModal_afterLoading('TEXT');
                                    } else {
                                        // No subtitles available at all
                                        that.showEmptySubtitleMessage(kind);
                                        // Don't set subtitle_loaded=true so user can retry
                                    }
                                }
                            } else {
                                // Check if native subtitles are available for fallback
                                var nativeSubtitles = this.safeGetTracks('TEXT');
                                if (nativeSubtitles && nativeSubtitles.length > 0) {
                                    // Render native subtitles as fallback
                                    var htmlContent = that.renderSubtitles('TEXT', nativeSubtitles);
                                    $("#subtitle-selection-container").html(htmlContent);
                                    $("#subtitle-modal-title").text("Subtitles (Native Only)");
                                    that.subtitle_loaded = true; // Only set AFTER successful rendering
                                    showToast("Info", "Enhanced subtitles unavailable. Using native subtitles.");
                                    that.showSubtitleAudioModal_afterLoading('TEXT');
                                } else {
                                    // No subtitles available at all
                                    that.showEmptySubtitleMessage(kind);
                                    // Don't set subtitle_loaded=true so user can retry
                                }
                            }
                        },
                        timeout: 10000, // 10 second timeout for non-Samsung API call
                        error:function (xhr, status, error){
                            
                            
                            
                            
                            that.subtitle_loading=false;
                            $('#subtitle-loader-container').hide();
                            
                            // Check if native subtitles are available for fallback
                            var nativeSubtitles = this.safeGetTracks('TEXT');
                            if (nativeSubtitles && nativeSubtitles.length > 0) {
                                // Render native subtitles as fallback
                                var htmlContent = that.renderSubtitles('TEXT', nativeSubtitles);
                                $("#subtitle-selection-container").html(htmlContent);
                                $("#subtitle-modal-title").text("Subtitles (Native Only)");
                                that.subtitle_loaded = true; // Only set AFTER successful rendering
                                showToast("Info", "Enhanced subtitles unavailable. Using native subtitles.");
                                that.showSubtitleAudioModal_afterLoading('TEXT');
                            } else {
                                // No subtitles available at all
                                that.showEmptySubtitleMessage(kind);
                                // Don't set subtitle_loaded=true so user can retry
                            }
                        }
                    })
                }
                else {
                    if(media_player.subtitles.length>0) {
                        this.renderSubtitles(kind, media_player.subtitles);
                    }else {
                        // **CRITICAL FIX**: Check for native subtitle fallback before showing empty message
                        var nativeSubtitles = this.safeGetTracks('TEXT');
                        if (nativeSubtitles && nativeSubtitles.length > 0) {
                            // Render native subtitles
                            var htmlContent = this.renderSubtitles('TEXT', nativeSubtitles);
                            $("#subtitle-selection-container").html(htmlContent);
                            $("#subtitle-modal-title").text("Subtitles (Native Only)");
                            this.subtitle_loaded = true; // Only after rendering
                            showToast("Info", "Enhanced subtitles unavailable. Using native subtitles.");
                            this.showSubtitleAudioModal_afterLoading('TEXT');
                        } else {
                            this.showEmptySubtitleMessage(kind);
                        }
                    }
                }
            }else {
                // Get native tracks first (existing logic)
                
                subtitles=this.safeGetTracks(kind);
                
                
                // For Samsung with TEXT subtitles, also fetch API subtitles
                if(platform==='samsung' && kind==='TEXT'){
                    
                    
                    // Check if we should also fetch API subtitles
                    if(!(this.current_movie_type==='movies' || (this.current_movie_type==='series' && settings.playlist_type==='xtreme'))) {
                        // Only native subtitles available for this content type
                        if(subtitles.length>0) {
                            this.renderSubtitles(kind, subtitles);
                            this.subtitle_loaded=true;
                        } else {
                            this.showEmptySubtitleMessage(kind);
                        }
                        return;
                    }
                    
                    var that = this;
                    // Store native subtitles for combining later
                    var nativeSubtitles = subtitles;
                    
                    if(!this.subtitle_loaded) {
                        $("#subtitle-selection-container").html('');
                        this.subtitle_loading=true;
                        $('#subtitle-selection-modal').modal('show');
                        this.hoverSubtitleBtn(0);
                        $('#subtitle-loader-container').show();
                        
                        // Build API request data (same as non-Samsung logic)
                        var subtitle_request_data;
                        if(this.current_movie_type==='movies'){
                            var original_name = this.current_movie.name;
                            var cleaned_name = original_name;
                            
                            // Extract year if present in name
                            var year_match = cleaned_name.match(/\((\d{4})\)/);
                            var extracted_year = null;
                            if (year_match) {
                                extracted_year = parseInt(year_match[1]);
                                cleaned_name = cleaned_name.replace(/\s*\(\d{4}\)\s*/, '').trim();
                            }
                            
                            // Remove quality indicators
                            var quality_patterns = /\s*\b(HD|4K|1080p|720p|480p|BluRay|BRRip|WEB-DL|WEBRip|DVDRip|CAMRip|TS|TC|HDTV|PDTV|XviD|x264|x265|HEVC|DivX|AC3|AAC|MP3|Dubbed|Subbed)\b\s*/gi;
                            cleaned_name = cleaned_name.replace(quality_patterns, ' ').trim();
                            cleaned_name = cleaned_name.replace(/\s+/g, ' ').trim();
                            
                            // Remove brackets content
                            cleaned_name = cleaned_name.replace(/\[.*?\]/g, '').trim();
                            cleaned_name = cleaned_name.replace(/\{.*?\}/g, '').trim();
                            cleaned_name = cleaned_name.replace(/\s+/g, ' ').trim();
                            
                            subtitle_request_data={
                                movie_name: cleaned_name,
                                movie_type: 'movie'
                            }
                            
                            // Add TMDB ID if available
                            if(this.current_movie.tmdb_id) {
                                subtitle_request_data.tmdb_id = this.current_movie.tmdb_id;
                            }
                            
                            // Add year for better matching
                            if(extracted_year) {
                                subtitle_request_data.year = extracted_year;
                            } else if(this.current_movie.year) {
                                subtitle_request_data.year = this.current_movie.year;
                            }
                            
                                                    } else {
                            // Series episodes
                            subtitle_request_data = {
                                movie_type: 'auto'
                            }
                            
                            if(this.current_movie && this.current_movie.info && this.current_movie.info.tmdb_id) {
                                subtitle_request_data.tmdb_id = String(this.current_movie.info.tmdb_id);
                            }
                        }
                        
                        // Make API call to get additional subtitles with enhanced error handling
                        $.ajax({
                            method:'post',
                            url:'https://exoapp.tv/api/get-subtitles',
                            data: subtitle_request_data,
                            dataType:'json',
                            timeout: 15000, // 15 second timeout for API call
                            success:function (result) {
                                that.subtitle_loading=false;
                                that.subtitle_loaded=true;
                                $('#subtitle-loader-container').hide();
                                
                                                                                                
                                var apiSubtitles = [];
                                if(result.status==='success' && result.subtitles && result.subtitles.length>0){
                                    apiSubtitles = result.subtitles;
                                    media_player.subtitles = result.subtitles;
                                                                    } else {
                                    media_player.subtitles = [];
                                    
                                }
                                
                                // Combine native and API subtitles
                                var combinedSubtitles = that.combineSubtitlesForSamsung(nativeSubtitles, apiSubtitles);
                                                                                                
                                if(combinedSubtitles.length > 0) {
                                    that.renderSubtitles(kind, combinedSubtitles);
                                    that.subtitle_loaded=true;
                                    
                                    // Show notification if only native subtitles are available
                                    if(apiSubtitles.length === 0 && nativeSubtitles.length > 0) {
                                        that.showSubtitleFallbackNotification('Enhanced subtitles unavailable. Using native subtitles.');
                                    }
                                } else {
                                    // **CRITICAL FIX**: Check for native subtitles before showing empty message
                                    if(nativeSubtitles.length > 0) {
                                                                                that.renderSubtitles(kind, nativeSubtitles);
                                        that.subtitle_loaded=true;
                                        that.showSubtitleFallbackNotification('Enhanced subtitles unavailable. Using native subtitles.');
                                    } else {
                                        that.showEmptySubtitleMessage(kind);
                                    }
                                }
                            },
                            error:function (xhr, status, error){
                                                                
                                
                                                                
                                // Properly manage loading flags
                                that.subtitle_loading=false;
                                that.subtitle_loaded=true;
                                $('#subtitle-loader-container').hide();
                                
                                // Determine error type for better user feedback
                                var errorType = 'network';
                                if(status === 'timeout') {
                                    errorType = 'timeout';
                                } else if(xhr.status === 0) {
                                    errorType = 'network';
                                } else if(xhr.status >= 500) {
                                    errorType = 'server';
                                } else if(xhr.status >= 400) {
                                    errorType = 'client';
                                }
                                
                                // Always fall back to native subtitles with proper user notification
                                if(nativeSubtitles.length > 0) {
                                                                        
                                    // Clear API subtitles to prevent confusion
                                    media_player.subtitles = [];
                                    
                                    // Show native subtitles in the modal
                                    that.renderSubtitles(kind, nativeSubtitles);
                                    
                                    // Show appropriate user notification based on error type
                                    var message = 'Enhanced subtitles unavailable';
                                    if(errorType === 'timeout') {
                                        message += ' (connection timeout)';
                                    } else if(errorType === 'network') {
                                        message += ' (network error)';
                                    } else if(errorType === 'server') {
                                        message += ' (server error)';
                                    }
                                    message += '. Using native subtitles.';
                                    
                                    that.showSubtitleFallbackNotification(message);
                                } else {
                                    // No native subtitles available either
                                    
                                    that.showEmptySubtitleMessage(kind);
                                }
                            }
                        });
                    } else {
                        // Subtitles already loaded, combine native with stored API subtitles
                        var apiSubtitles = media_player.subtitles || [];
                        var combinedSubtitles = this.combineSubtitlesForSamsung(nativeSubtitles, apiSubtitles);
                        
                        if(combinedSubtitles.length > 0) {
                            this.renderSubtitles(kind, combinedSubtitles);
                            this.subtitle_loaded=true;
                        } else {
                            // Re-check for native subtitles before showing empty message
                            var currentNativeSubtitles = this.safeGetTracks(kind);
                            if(currentNativeSubtitles && currentNativeSubtitles.length > 0) {
                                                                this.renderSubtitles(kind, currentNativeSubtitles);
                                this.subtitle_loaded=true;
                                this.showSubtitleFallbackNotification('Enhanced subtitles unavailable. Using native subtitles.');
                            } else {
                                this.showEmptySubtitleMessage(kind);
                            }
                        }
                    }
                } else {
                    // Non-TEXT kind or non-Samsung platform
                    if(kind === "TEXT" && platform !== 'samsung') {
                        // **CRITICAL FIX**: Non-Samsung TEXT subtitles - implement proper fallback
                                                
                        
                        var that = this;
                        var nativeSubtitles = subtitles; // Store native subtitles for fallback
                        
                        // Check if we should try API subtitles
                        if(this.current_movie_type==='movies' || (this.current_movie_type==='series' && settings.playlist_type==='xtreme')) {
                            if(!this.subtitle_loaded) {
                                // Try to get API subtitles first, with native fallback
                                this.subtitle_loading=true;
                                $('#subtitle-selection-container').html('');
                                $('#subtitle-selection-modal').modal('show');
                                this.hoverSubtitleBtn(0);
                                $('#subtitle-loader-container').show();
                                
                                // Build API request data
                                var subtitle_request_data;
                                if(this.current_movie_type==='movies'){
                                    var original_name = this.current_movie.name;
                                    var cleaned_name = original_name;
                                    
                                    var year_match = cleaned_name.match(/\((\d{4})\)/);
                                    var extracted_year = null;
                                    if (year_match) {
                                        extracted_year = parseInt(year_match[1]);
                                        cleaned_name = cleaned_name.replace(/\s*\(\d{4}\)\s*/, '').trim();
                                    }
                                    
                                    var quality_patterns = /\s*\b(HD|4K|1080p|720p|480p|BluRay|BRRip|WEB-DL|WEBRip|DVDRip|CAMRip|TS|TC|HDTV|PDTV|XviD|x264|x265|HEVC|DivX|AC3|AAC|MP3|Dubbed|Subbed)\b\s*/gi;
                                    cleaned_name = cleaned_name.replace(quality_patterns, ' ').trim();
                                    cleaned_name = cleaned_name.replace(/\s+/g, ' ').trim();
                                    cleaned_name = cleaned_name.replace(/\[.*?\]/g, '').trim();
                                    cleaned_name = cleaned_name.replace(/\{.*?\}/g, '').trim();
                                    cleaned_name = cleaned_name.replace(/\s+/g, ' ').trim();
                                    
                                    subtitle_request_data={
                                        movie_name: cleaned_name,
                                        movie_type: 'movie'
                                    }
                                    
                                    if(this.current_movie.tmdb_id) {
                                        subtitle_request_data.tmdb_id = this.current_movie.tmdb_id;
                                    }
                                    
                                    if(extracted_year) {
                                        subtitle_request_data.year = extracted_year;
                                    } else if(this.current_movie.year) {
                                        subtitle_request_data.year = this.current_movie.year;
                                    }
                                } else {
                                    subtitle_request_data = {
                                        movie_type: 'auto'
                                    }
                                    
                                    if(this.current_movie && this.current_movie.info && this.current_movie.info.tmdb_id) {
                                        subtitle_request_data.tmdb_id = String(this.current_movie.info.tmdb_id);
                                    }
                                }
                                
                                $.ajax({
                                    method:'post',
                                    url:'https://exoapp.tv/api/get-subtitles',
                                    data: subtitle_request_data,
                                    dataType:'json',
                                    timeout: 10000,
                                    success:function (result) {
                                        that.subtitle_loading=false;
                                        $('#subtitle-loader-container').hide();
                                        
                                        var apiSubtitles = [];
                                        if(result.status==='success' && result.subtitles && result.subtitles.length>0){
                                            apiSubtitles = result.subtitles;
                                            media_player.subtitles = result.subtitles;
                                                                                    } else {
                                            media_player.subtitles = [];
                                            
                                        }
                                        
                                        // Combine native and API subtitles for non-Samsung
                                        var allSubtitles = [];
                                        
                                        // Add native subtitles first
                                        if(nativeSubtitles && nativeSubtitles.length > 0) {
                                            nativeSubtitles.forEach(function(nativeSub) {
                                                var enhancedNative = Object.assign({}, nativeSub);
                                                enhancedNative.source = 'native';
                                                enhancedNative.isNative = true;
                                                allSubtitles.push(enhancedNative);
                                            });
                                        }
                                        
                                        // Add API subtitles
                                        if(apiSubtitles.length > 0) {
                                            apiSubtitles.forEach(function(apiSub) {
                                                var enhancedApi = Object.assign({}, apiSub);
                                                enhancedApi.source = 'api';
                                                enhancedApi.isNative = false;
                                                allSubtitles.push(enhancedApi);
                                            });
                                        }
                                        
                                        if(allSubtitles.length > 0) {
                                            that.renderSubtitles(kind, allSubtitles);
                                            that.subtitle_loaded=true;
                                            
                                            // Show notification if only native subtitles available
                                            if(apiSubtitles.length === 0 && nativeSubtitles.length > 0) {
                                                that.showSubtitleFallbackNotification('Enhanced subtitles unavailable. Using native subtitles.');
                                            }
                                        } else {
                                            // **CRITICAL FIX**: This should never happen since nativeSubtitles are included in allSubtitles
                                            // But add fallback check as extra safety
                                            var fallbackNativeSubtitles = this.safeGetTracks('TEXT');
                                            if (fallbackNativeSubtitles && fallbackNativeSubtitles.length > 0) {
                                                                                                var htmlContent = that.renderSubtitles('TEXT', fallbackNativeSubtitles);
                                                $("#subtitle-selection-container").html(htmlContent);
                                                $("#subtitle-modal-title").text("Subtitles (Native Only)");
                                                that.subtitle_loaded = true; // Only after rendering
                                                showToast("Info", "Enhanced subtitles unavailable. Using native subtitles.");
                                                that.showSubtitleAudioModal_afterLoading('TEXT');
                                            } else {
                                                that.showEmptySubtitleMessage(kind);
                                            }
                                        }
                                    },
                                    error:function (xhr, status, error){
                                        
                                        
                                        
                                        
                                        that.subtitle_loading=false;
                                        $('#subtitle-loader-container').hide();
                                        
                                        // **CRITICAL FIX**: Fall back to native subtitles on API error
                                        if(nativeSubtitles && nativeSubtitles.length > 0) {
                                                                                        
                                            // Clear API subtitles
                                            media_player.subtitles = [];
                                            
                                            // Show native subtitles with source labeling
                                            var labeledNativeSubtitles = nativeSubtitles.map(function(nativeSub) {
                                                var enhancedNative = Object.assign({}, nativeSub);
                                                enhancedNative.source = 'native';
                                                enhancedNative.isNative = true;
                                                return enhancedNative;
                                            });
                                            
                                            that.renderSubtitles(kind, labeledNativeSubtitles);
                                            that.subtitle_loaded=true;
                                            
                                            // Show appropriate user notification
                                            var message = 'Enhanced subtitles unavailable';
                                            if(status === 'timeout') {
                                                message += ' (connection timeout)';
                                            } else if(xhr.status === 0) {
                                                message += ' (network error)';
                                            } else if(xhr.status >= 500) {
                                                message += ' (server error)';
                                            }
                                            message += '. Using native subtitles.';
                                            
                                            that.showSubtitleFallbackNotification(message);
                                        } else {
                                            // No native subtitles available either
                                            
                                            that.showEmptySubtitleMessage(kind);
                                        }
                                    }
                                });
                            } else {
                                // Subtitles already loaded - check both API and native
                                var apiSubtitles = media_player.subtitles || [];
                                var allSubtitles = [];
                                
                                // Add native subtitles
                                if(nativeSubtitles && nativeSubtitles.length > 0) {
                                    nativeSubtitles.forEach(function(nativeSub) {
                                        var enhancedNative = Object.assign({}, nativeSub);
                                        enhancedNative.source = 'native';
                                        enhancedNative.isNative = true;
                                        allSubtitles.push(enhancedNative);
                                    });
                                }
                                
                                // Add API subtitles
                                if(apiSubtitles.length > 0) {
                                    apiSubtitles.forEach(function(apiSub) {
                                        var enhancedApi = Object.assign({}, apiSub);
                                        enhancedApi.source = 'api';
                                        enhancedApi.isNative = false;
                                        allSubtitles.push(enhancedApi);
                                    });
                                }
                                
                                if(allSubtitles.length > 0) {
                                    this.renderSubtitles(kind, allSubtitles);
                                } else {
                                    // **CRITICAL FIX**: This should never happen since nativeSubtitles are included in allSubtitles
                                    // But add fallback check as extra safety
                                    var fallbackNativeSubtitles = this.safeGetTracks('TEXT');
                                    if (fallbackNativeSubtitles && fallbackNativeSubtitles.length > 0) {
                                                                                var htmlContent = this.renderSubtitles('TEXT', fallbackNativeSubtitles);
                                        $("#subtitle-selection-container").html(htmlContent);
                                        $("#subtitle-modal-title").text("Subtitles (Native Only)");
                                        this.subtitle_loaded = true; // Only after rendering
                                        showToast("Info", "Enhanced subtitles unavailable. Using native subtitles.");
                                        this.showSubtitleAudioModal_afterLoading('TEXT');
                                    } else {
                                        this.showEmptySubtitleMessage(kind);
                                    }
                                }
                            }
                        } else {
                            // No API subtitle support for this content type - use native only
                            if(nativeSubtitles.length > 0) {
                                this.renderSubtitles(kind, nativeSubtitles);
                                this.subtitle_loaded=true;
                            } else {
                                this.showEmptySubtitleMessage(kind);
                            }
                        }
                    } else {
                        // Non-TEXT kind (audio tracks) - use existing logic
                        if(subtitles.length>0) {
                            this.renderSubtitles(kind, subtitles);
                        } else {
                            if(kind==="TEXT")
                                showToast("Sorry","No Subtitles exists");
                            else
                                showToast("Sorry","No Audios exists");
                        }
                    }
                }
            }
        }catch (e) {
            // showToast("Sorry","Video not loaded yet");
            if(kind=="TEXT")
                showToast("Sorry","No Subtitles exists");
            else
                showToast("Sorry","No Audio exists");
        }
    },
    changeScreenRatio:function(){
        try{
            media_player.toggleScreenRatio();
        }catch (e) {
        }
    },
    showStreamSummaryFromVideo:function(){
        var stream_summary='No Info';
        if(platform==='lg'){
            try{
                stream_summary = media_player.videoObj.videoWidth + '*' + media_player.videoObj.videoHeight;
            }catch (e) {
    
            }
        }else{
            try{
                var stream_info=webapis.avplay.getCurrentStreamInfo();
                if(typeof stream_info[0]!='undefined'){
                    var extra_info=JSON.parse(stream_info[0].extra_info);
                    stream_summary=extra_info.Width+'*'+extra_info.Height;
                }
            }catch (e) {
            }
        }
        if(!stream_summary)
            stream_summary='No Info';
        $('#vod-video-info-subwrapper2').text(stream_summary);
    },
    showVideoInfo:function(){
        var movie=this.current_movie;
        this.hideControlBar();
        this.keys.prev_focus=this.keys.focused_part;
        var vod_desc='', stream_summary='No Info', stream_icon, stream_title;
        if(this.current_movie_type==='movies'){
            stream_title=movie.name;
            stream_icon = movie.stream_icon;
        }else{  // if series
            stream_title=movie.title;
            stream_icon='images/series.png';
        }
        var that=this;
        if(settings.playlist_type==="xtreme") {
            if(this.current_movie_type==='movies'){
                $.getJSON(api_host_url+'/player_api.php?username='+user_name+'&password='+password+'&action=get_vod_info&vod_id='+current_movie.stream_id, function (response) {
                    var info = response.info;
                    if (typeof info.description != 'undefined')
                        vod_desc = info.description;
                    if (typeof info.video != 'undefined') {
                        if (typeof info.video.width != 'undefined' && typeof info.video.height) {
                            stream_summary = info.video.width + '*' + info.video.height;
                        }
                        if (typeof info.video.codec_long_name != 'undefined')
                            stream_summary = stream_summary + ', ' + info.video.codec_long_name;
                        $('#vod-video-info-subwrapper2').text(stream_summary);
                        if (stream_summary==='No Info'){
                            that.showStreamSummaryFromVideo();
                        }
                    }else{
                        that.showStreamSummaryFromVideo();
                    }
                    $('#vod-video-info-desc').text(vod_desc);
                }).fail(function () {
                    that.showStreamSummaryFromVideo();
                })
            }
            else{
                if(typeof movie.info!="undefined"){
                    var info=movie.info;
                    if(typeof info.plot!='undefined')
                        vod_desc=info.plot;
                    stream_icon=info.movie_image
                    if(typeof info.video!="undefined"){
                        stream_summary = info.video.width + '*' + info.video.height;
                        if (typeof info.video.codec_long_name != 'undefined')
                            stream_summary = stream_summary + ', ' + info.video.codec_long_name;
                    }else{
                        that.showStreamSummaryFromVideo();
                    }
                }else{
                    that.showStreamSummaryFromVideo();
                }
                $('#vod-video-info-desc').text(vod_desc);
            }
        }else{
            $('#vod-video-info-desc').text(vod_desc);
            that.showStreamSummaryFromVideo();
        }
        $('#vod-video-info-title').text(stream_title);
        $('#vod-video-info-img-container img').attr('src',stream_icon);
        $('#vod-video-info-container').show();
        clearTimeout(this.vod_info_timer);
        var keys=this.keys;
        keys.focused_part='vod_info';
        this.vod_info_timer=setTimeout(function () {
            $('#vod-video-info-container').hide();
            keys.focused_part=keys.prev_focus;
        },10000)
    },
    renderSubtitles:function (kind, subtitles) {
        
        // Store subtitles globally for Samsung hybrid access in confirmSubtitle
        if(platform === 'samsung' && kind === 'TEXT') {
            window.lastRenderedSubtitles = subtitles;
        }
        
        if(subtitles && subtitles.length > 0) {
            subtitles.forEach((subtitle, index) => {
            });
        }
        
        var that=this;
        this.hideControlBar();
        if(kind=="TEXT")
            $("#subtitle-modal-title").text("Subtitle");
        else {
            $("#subtitle-modal-title").text("Audio Track");
        }
        this.keys.focused_part="subtitle_audio_selection_modal";
        $('#subtitle-selection-modal').find('.modal-operation-menu-type-2').removeClass('active');
        
        var htmlContent=this.makeMediaTrackElement(subtitles, kind);
        
        $("#subtitle-selection-container").html(htmlContent);
        $('#subtitle-selection-modal').modal('show');
        var subtitle_menus=$('#subtitle-selection-modal .subtitle-item');
        this.subtitle_audio_menus=subtitle_menus;
        
        // **FIX SUBTITLE SELECTION PERSISTENCE**: Better logic for Samsung combined subtitles
        var diff_index=kind==='TEXT' ? 1 : 0;
        var current_selected_index=kind==="TEXT" ? this.current_subtitle_index : this.current_audio_track_index;
        var selectionFound = false;
        
        if(typeof env !== 'undefined' && env === 'develop') {
            
        }
        
        // First try to match using combinedIndex or value from checkboxes
        $(subtitle_menus).each(function(menuIndex, menuElement) {
            var checkbox = $(menuElement).find('input');
            var checkboxValue = parseInt(checkbox.val());
            
            if(typeof env !== 'undefined' && env === 'develop') {
            }
            
            if(checkboxValue === current_selected_index) {
                $(subtitle_menus).find('input').prop('checked', false);
                checkbox.prop('checked', true);
                that.hoverSubtitle(menuIndex);
                selectionFound = true;
                if(typeof env !== 'undefined' && env === 'develop') {
                }
                return false; // break out of each loop
            }
        });
        
        // If no selection found, default to first option ("Turn Off Subtitles")
        if(!selectionFound) {
            $(subtitle_menus[0]).find('input').prop('checked',true);
            this.hoverSubtitle(0);
            if(typeof env !== 'undefined' && env === 'develop') {
            }
        }
    },
    showEmptySubtitleMessage: function (kind) {
        $('#subtitle-selection-modal').modal('hide');
        if(kind==="TEXT")
            showToast("Sorry","No Subtitles exists");
        else
            showToast("Sorry","No Audios exists");
        var keys=this.keys;
        if(keys.focused_part!="resume_bar")
            keys.focused_part=keys.prev_focus;
    },
    showSubtitleFallbackNotification: function(message) {
        // Show a non-intrusive notification that enhanced subtitles failed but native are available
        
        // Use a less intrusive notification style for fallback scenarios
        // This informs users about the situation without being alarming
        if(typeof showToast === 'function') {
            showToast("Info", message);
        } else {
            console.warn('showToast function not available, fallback notification not shown');
        }
        
        // Could also add a visual indicator in the subtitle modal header
        var modalTitle = $('#subtitle-modal-title');
        if(modalTitle.length > 0) {
            var originalTitle = modalTitle.text();
            if(!originalTitle.includes('(Native Only)')) {
                modalTitle.text(originalTitle + ' (Native Only)');
                
                // Reset title after a delay
                setTimeout(function() {
                    if(modalTitle.text().includes('(Native Only)')) {
                        modalTitle.text(originalTitle);
                    }
                }, 5000);
            }
        }
    },
    combineSubtitlesForSamsung: function(nativeSubtitles, apiSubtitles) {
        
        // **EDGE CASE HANDLING**: Ensure arrays are valid
        nativeSubtitles = nativeSubtitles || [];
        apiSubtitles = apiSubtitles || [];
        
        if(typeof env !== 'undefined' && env === 'develop') {
            console.log('=== SUBTITLE AVAILABILITY DEBUG ===');
            console.log('Native subtitles available:', nativeSubtitles.length);
            console.log('API subtitles available:', apiSubtitles.length);
            
            if(nativeSubtitles.length === 0) {
                console.log('=== NO NATIVE SUBTITLES - API ONLY MODE ===');
            }
        }
        
        var combined = [];
        
        // **NEW APPROACH**: Add API subtitles FIRST with clean sequential indices
        apiSubtitles.forEach(function(apiSub, index) {
            // Create a Samsung-compatible subtitle object with explicit source metadata
            var samsungApiSub = {
                source: 'api', // Explicit source identification
                combinedIndex: index, // Clean sequential index starting from 0
                originalIndex: index, // Original API subtitle index
                type: "TEXT",
                extra_info: {
                    track_lang: apiSub.label || apiSub.lang || ('API Subtitle ' + (index + 1)),
                    subtitle_type: "0",
                    fourCC: "un"
                },
                isNative: false, // Backward compatibility
                apiData: {
                    file: apiSub.file,
                    label: apiSub.label,
                    lang: apiSub.lang,
                    id: apiSub.id // Include subtitle ID for proper mapping
                }
            };
            combined.push(samsungApiSub);
        });
        
        // **NEW APPROACH**: Add native subtitles at the END for clear separation
        nativeSubtitles.forEach(function(nativeSub, index) {
            // Enhance native subtitle with explicit source metadata
            var enhancedNative = Object.assign({}, nativeSub);
            enhancedNative.source = 'native'; // Explicit source identification
            enhancedNative.isNative = true; // Backward compatibility
            
            // **CRITICAL FIX**: Get index from extra_info.index, not nativeSub.index
            var nativeIndex = nativeSub.extra_info && nativeSub.extra_info.index !== undefined 
                ? nativeSub.extra_info.index 
                : nativeSub.index;
            
            enhancedNative.originalIndex = nativeIndex; // Preserve original Samsung index
            enhancedNative.index = nativeIndex; // Also set top-level index for compatibility
            enhancedNative.combinedIndex = apiSubtitles.length + index; // Place AFTER all API subtitles
            
            // Enhance native subtitle label for better user experience
            if(enhancedNative.extra_info && enhancedNative.extra_info.track_lang) {
                var currentLabel = enhancedNative.extra_info.track_lang;
                if(currentLabel === 'un' || currentLabel === '' || !currentLabel) {
                    enhancedNative.extra_info.track_lang = 'Native Subtitle ' + (index + 1);
                } else {
                    enhancedNative.extra_info.track_lang = currentLabel + ' (Native)';
                }
            }
            
            if(typeof env !== 'undefined' && env === 'develop') {
                console.log('=== NATIVE SUBTITLE AT END DEBUG ===');
                console.log('Native subtitle placed at combinedIndex:', enhancedNative.combinedIndex);
                console.log('Samsung originalIndex:', nativeIndex);
                console.log('Enhanced label:', enhancedNative.extra_info.track_lang);
            }
            
            combined.push(enhancedNative);
        });
        
        // Store the combined subtitles mapping for later use
        window.subtitleMapping = {
            combined: combined,
            nativeCount: nativeSubtitles.length,
            apiCount: apiSubtitles.length,
            hasNativeSubtitles: nativeSubtitles.length > 0,
            hasApiSubtitles: apiSubtitles.length > 0,
            apiOnlyMode: nativeSubtitles.length === 0 && apiSubtitles.length > 0
        };
        
        console.log('Combined subtitles result:', combined);
        console.log('Subtitle mapping created:', window.subtitleMapping);
        
        // **USER FEEDBACK**: Inform when only API subtitles are available
        if(window.subtitleMapping.apiOnlyMode && typeof env !== 'undefined' && env === 'develop') {
            console.log('=== API ONLY MODE: No native subtitles found, using exoapp.tv subtitles only ===');
        }
        
        return combined;
    },
    cancelSubtitle:function(){
        $('#subtitle-selection-modal').modal('hide');
        this.keys.focused_part=this.keys.prev_focus;
    },
    confirmSubtitle:function(){
        var modal_title=$("#subtitle-modal-title").text();
        var kind=modal_title.toLowerCase().includes('subtitle') ? 'TEXT' : 'AUDIO';
        $('#subtitle-selection-modal').modal('hide');
        this.keys.focused_part=this.keys.prev_focus;
        
        if(modal_title.toLowerCase().includes('subtitle')){
            var selectedCombinedIndex = parseInt($('#subtitle-selection-modal').find('input[type=checkbox]:checked').val());
            
            if(typeof env !== 'undefined' && env === 'develop') {
                
                
            }
            
            try{
                // Handle "No Subtitles" selection
                if(selectedCombinedIndex === -1){
                    if(typeof env !== 'undefined' && env === 'develop') {
                    }
                    this.show_subtitle=false;
                    $("#vod-series-player-page").find('.subtitle-container').css({visibility:'hidden'});
                    
                    // Stop all subtitle operations
                    if(platform === "samsung") {
                        // Stop native Samsung subtitles
                        try {
                            media_player.setSubtitleOrAudioTrack("TEXT", -1);
                        } catch(e) {}
                        // Stop API subtitles
                        SrtOperation.stopOperation();
                    } else {
                        SrtOperation.deStruct();
                    }
                    return;
                }
                
                this.show_subtitle=true;
                $("#vod-series-player-page").find('.subtitle-container').css({visibility:'visible'});
                
                // Use explicit source detection with fallback for non-Samsung platforms
                var selectedSubtitle = null;
                var subtitleSource = null;
                
                // **Samsung Platform**: Use robust mapping system
                if(platform === 'samsung' && window.subtitleMapping && window.subtitleMapping.combined) {
                    selectedSubtitle = window.subtitleMapping.combined[selectedCombinedIndex];
                    if(selectedSubtitle) {
                        subtitleSource = selectedSubtitle.source; // Explicit source metadata
                    }
                    
                    if(typeof env !== 'undefined' && env === 'develop') {
                        console.log('=== SAMSUNG SUBTITLE SELECTION DEBUG ===');
                        console.log('window.subtitleMapping exists:', !!window.subtitleMapping);
                        console.log('window.subtitleMapping.combined exists:', !!(window.subtitleMapping && window.subtitleMapping.combined));
                        console.log('window.subtitleMapping.combined.length:', window.subtitleMapping && window.subtitleMapping.combined ? window.subtitleMapping.combined.length : 'undefined');
                        
                        console.log('selectedSubtitle from mapping:', selectedSubtitle);
                        
                    }
                } else {
                    // **LG/Other Platforms**: Use traditional API subtitle system
                    if(media_player.subtitles && selectedCombinedIndex >= 0 && selectedCombinedIndex < media_player.subtitles.length) {
                        selectedSubtitle = media_player.subtitles[selectedCombinedIndex];
                        subtitleSource = 'api'; // LG only uses API subtitles
                    }
                    
                    if(typeof env !== 'undefined' && env === 'develop') {
                                                                        console.log('media_player.subtitles.length:', media_player.subtitles ? media_player.subtitles.length : 'undefined');
                        
                                                
                    }
                }
                
                if(typeof env !== 'undefined' && env === 'develop') {
                    
                    
                                                                            }
                
                if(!selectedSubtitle || !subtitleSource) {
                    if(typeof env !== 'undefined' && env === 'develop') {
                        console.log('Subtitle mapping exists:', !!window.subtitleMapping);
                        console.log('API subtitles exist:', !!(media_player.subtitles && media_player.subtitles.length > 0));
                    }
                    showToast("Error", "Invalid subtitle selection");
                    return;
                }
                
                // **DUAL HANDLING LOGIC**: Proper branching based on explicit source
                if(subtitleSource === 'native') {
                    // **NATIVE SUBTITLE**: Use setSelectTrack() and stop any SrtOperation
                    if(typeof env !== 'undefined' && env === 'develop') {
                        console.log('Original native index:', selectedSubtitle.originalIndex);
                    }
                    
                    // Stop any running API subtitle operations
                    SrtOperation.stopOperation();
                    
                    // Use native Samsung subtitle with original index
                    var nativeIndex = selectedSubtitle.originalIndex || selectedSubtitle.index;
                    
                    if(typeof env !== 'undefined' && env === 'develop') {
                        console.log('=== NATIVE SUBTITLE INDEX DEBUG ===');
                        console.log('selectedSubtitle:', selectedSubtitle);
                        console.log('selectedSubtitle.originalIndex:', selectedSubtitle.originalIndex);
                        console.log('selectedSubtitle.index:', selectedSubtitle.index);
                        console.log('calculated nativeIndex:', nativeIndex);
                        console.log('nativeIndex type:', typeof nativeIndex);
                    }
                    
                    // Validate the native index before using it
                    if (typeof nativeIndex !== 'undefined' && nativeIndex !== null && !isNaN(nativeIndex)) {
                        media_player.setSubtitleOrAudioTrack("TEXT", nativeIndex);
                        this.current_subtitle_index = nativeIndex;
                        
                        if(typeof env !== 'undefined' && env === 'develop') {
                            console.log('=== Native Samsung subtitle activated ===');
                            console.log('Track index:', nativeIndex);
                        }
                    } else {
                        if(typeof env !== 'undefined' && env === 'develop') {
                            console.log('=== NATIVE SUBTITLE ERROR ===');
                            console.log('Invalid nativeIndex, cannot set Samsung native subtitle');
                        }
                        showToast("Error", "Invalid native subtitle index");
                    }
                    
                } else if(subtitleSource === 'api') {
                    // **API SUBTITLE**: Stop native tracks and use SrtOperation
                    if(typeof env !== 'undefined' && env === 'develop') {
                        console.log('API subtitle data:', selectedSubtitle.apiData || selectedSubtitle);
                    }
                    
                    // Stop native subtitle track first (only if native subtitles exist)
                    if(platform === 'samsung' && window.subtitleMapping && window.subtitleMapping.hasNativeSubtitles) {
                        try {
                            // Only disable native subtitles if they exist and are currently active
                            if(typeof env !== 'undefined' && env === 'develop') {
                                console.log('=== Disabling native Samsung subtitles for API subtitle ===');
                            }
                            media_player.setSubtitleOrAudioTrack("TEXT", -1);
                        } catch(e) {
                            if(typeof env !== 'undefined' && env === 'develop') {
                                console.log('=== Note: Could not disable native subtitles (may not be active) ===');
                                console.log('Error:', e.message);
                            }
                        }
                    }
                    
                    // Load and initialize API subtitle using SrtOperation
                    var subtitleFile = selectedSubtitle.apiData ? selectedSubtitle.apiData.file : selectedSubtitle.file;
                    if(subtitleFile) {
                        // Ensure the URL is absolute
                        var subtitleUrl = subtitleFile;
                        if(subtitleUrl.startsWith('/')) {
                            subtitleUrl = 'https://exoapp.tv' + subtitleUrl;
                        }
                        
                        var that = this;
                        this.subtitle_loading = true; // Set loading state
                        
                        $.ajax({
                            url: subtitleUrl,
                            method: 'GET',
                            dataType: 'text',
                            success: function(subtitleContent) {
                                that.subtitle_loading = false; // Clear loading state
                                that.subtitle_loaded = true; // Set loaded state
                                
                                if(typeof env !== 'undefined' && env === 'develop') {
                                }
                                
                                // Get current time for initialization
                                var current_time = 0;
                                try {
                                    if (platform === 'samsung' && typeof webapis !== 'undefined' && webapis.avplay) {
                                        current_time = webapis.avplay.getCurrentTime() / 1000; // Convert ms to seconds
                                    } else if (media_player.videoObj && media_player.videoObj.currentTime) {
                                        current_time = media_player.videoObj.currentTime;
                                    }
                                } catch (e) {
                                    current_time = 0; // Fallback to 0
                                }
                                
                                // Initialize SrtOperation with the loaded content
                                SrtOperation.init({content: subtitleContent}, current_time);
                                that.current_subtitle_index = selectedSubtitle.combinedIndex || selectedCombinedIndex;
                            },
                            error: function(error) {
                                that.subtitle_loading = false; // Clear loading state on error
                                
                                if(typeof env !== 'undefined' && env === 'develop') {
                                    console.log('Error:', error);
                                }
                                
                                // **CRITICAL FIX**: Check for native subtitle fallback
                                var nativeSubtitles = this.safeGetTracks('TEXT');
                                if (nativeSubtitles && nativeSubtitles.length > 0) {
                                    console.log('Falling back to native subtitles after API subtitle file load error');
                                    
                                    // Render native subtitles
                                    var htmlContent = that.renderSubtitles('TEXT', nativeSubtitles);
                                    $("#subtitle-selection-container").html(htmlContent);
                                    $("#subtitle-modal-title").text("Subtitles (Native Only)");
                                    that.subtitle_loaded = true; // Only after successful rendering
                                    showToast("Info", "API subtitle file unavailable. Using native subtitles.");
                                    that.showSubtitleAudioModal_afterLoading('TEXT');
                                } else {
                                    that.subtitle_loaded = false; // Set error state
                                    showToast("Error", "Failed to load subtitle file");
                                }
                            }
                        });
                    } else {
                        this.subtitle_loading = false;
                        this.subtitle_loaded = false;
                        if(typeof env !== 'undefined' && env === 'develop') {
                        }
                        showToast("Error", "No subtitle file available");
                    }
                } else {
                    // Unknown source - should not happen with explicit metadata
                    if(typeof env !== 'undefined' && env === 'develop') {
                    }
                    showToast("Error", "Unknown subtitle source");
                }
                
            }catch(e){
                this.subtitle_loading = false; // Clear loading state on error
                this.subtitle_loaded = false;
                if(typeof env !== 'undefined' && env === 'develop') {
                    console.log('Error:', e);
                }
                showToast("Error", "Subtitle selection failed");
            }
        }
        else{
            // Audio track selection
            this.current_audio_track_index=$('#subtitle-selection-modal').find('input[type=checkbox]:checked').val();
            try{
                media_player.setSubtitleOrAudioTrack("AUDIO",parseInt(this.current_audio_track_index));
            }catch(e){
                // Handle audio track setting errors silently
            }
            console.log(this.current_audio_track_index);
        }
    },
    removeAllActiveClass:function(){
        $(this.video_control_doms).removeClass('active');
        $(this.video_info_doms).removeClass('active');
        $(this.video_control_doms).removeClass('active');
        $(this.episode_doms).removeClass('active');
        $('#vod-series-player-page .rangeslider').removeClass('active');
    },
    hoverSubtitle:function(index){
        console.log('Index:', index);
        console.log('Available subtitle menus:', this.subtitle_audio_menus.length);
        
        var keys=this.keys;
        keys.focused_part="subtitle_audio_selection_modal";
        $(this.subtitle_audio_menus).removeClass('active');
        $(this.subtitle_btn_doms).removeClass('active');
        keys.subtitle_audio_selection_modal=index;
        
        console.log('Focused index:', keys.subtitle_audio_selection_modal);
        console.log('Focused part:', keys.focused_part);
        
        moveScrollPosition($('#subtitle-selection-container'),this.subtitle_audio_menus[keys.subtitle_audio_selection_modal],'vertical',false);
        $(this.subtitle_audio_menus[keys.subtitle_audio_selection_modal]).addClass('active');
        
        console.log('Active subtitle element:', this.subtitle_audio_menus[keys.subtitle_audio_selection_modal]);
    },
    hoverSubtitleBtn: function (index){
        var keys=this.keys;
        keys.focused_part="subtitle_btn_selection";
        keys.subtitle_btn_selection=index;
        $(this.subtitle_btn_doms).removeClass('active');
        $(this.subtitle_audio_menus).removeClass('active');
        $(this.subtitle_btn_doms[index]).addClass('active');
    },
    hoverSlider:function(){
        this.removeAllActiveClass();
        this.keys.focused_part='slider';
        $('#vod-series-player-page .rangeslider').addClass('active');
    },
    hoverVideoControlIcon:function(index){
        $('#player-episode-container').removeClass('expanded');
        this.showControlBar(false);
        this.removeAllActiveClass();
        var keys=this.keys;
        keys.focused_part="control_bar";
        keys.control_bar=index;
        $(this.video_control_doms[index]).addClass('active');
    },
    hoverVideoInfoIcon:function(index){
        $('#player-episode-container').removeClass('expanded');
        this.showControlBar(false);
        var keys=this.keys;
        this.removeAllActiveClass();
        keys.focused_part="info_bar";
        keys.info_bar=index;
        $(this.video_info_doms[index]).addClass('active');
    },
    hoverEpisode:function(index){
        $('#player-episode-container').addClass('expanded');
        this.showControlBar(false);
        var keys=this.keys;
        this.removeAllActiveClass();
        keys.focused_part="episode_selection";
        keys.episode_selection=index;
        $(this.episode_doms[index]).addClass('active');
        moveScrollPosition($('#player-episode-items-wrapper'),this.episode_doms[keys.episode_selection],'horizontal',false)
    },
    hoverResumeBtn:function(index){
        var keys=this.keys;
        keys.resume_bar=index;
        keys.focused_part='resume_bar';
        $(this.resume_bar_doms).removeClass('active');
        $(this.resume_bar_doms[index]).addClass('active');
        clearTimeout(this.resume_timer);
        this.resume_timer=null;
        this.resume_timer=setTimeout(function () {
            $('#video-resume-modal').hide();
            if(keys.focused_part=='resume_bar')
                // only when focus on resume bar, change into prev focus when hiding resume modal
                keys.focused_part='control_bar';
            else if(keys.focused_part==="subtitle_audio_selection_modal" || keys.focused_part=="subtitle_btn_selection")
                keys.prev_focus="control_bar";
        },15000)
    },
    handleMenuClick:function(){
        var keys=this.keys;
        if(keys.focused_part==='resume_bar' && $('#video-resume-modal').css("display")==='none')
            keys.focused_part='control_bar';
        if(!this.show_control && (keys.focused_part==='control_bar' || keys.focused_part==='info_bar' || keys.focused_part==='episode_selection' || keys.focused_part==='slider')){
            this.showControlBar(true);
            return;
        }
        switch (keys.focused_part) {
            case "control_bar":
                this.showControlBar(false);
                $(this.video_control_doms[keys.control_bar]).trigger('click');
                break;
            case "info_bar":
                if(this.show_control){
                    this.showControlBar(false);
                    $(this.video_info_doms[keys.info_bar]).find('.video-info-icon').trigger('click');
                }
                break;
            case "episode_selection":
                this.showControlBar(false);
                $(this.episode_doms[keys.episode_selection]).trigger('click');
                break;
            case "resume_bar":
                this.goBack();
                if(keys.resume_bar==0){
                    if(platform==='samsung'){
                        try{
                            var current_time=webapis.avplay.getCurrentTime();
                            if(current_time<this.resume_time){
                                webapis.avplay.seekTo(this.resume_time)
                                $(this.slider_element).val(this.resume_time/1000).change();
                            }
                        }catch (e) {
                        }
                    }
                    else if(platform==='lg'){
                        try{
                            var current_time=media_player.videoObj.currentTime;
                            if(current_time<this.resume_time){
                                media_player.videoObj.currentTime=this.resume_time;
                                $('#'+media_player.parent_id).find('.video-current-time').html(media_player.formatTime(this.resume_time));
                                var duration=media_player.videoObj.duration;
                                if (duration > 0) {
                                    $(this.slider_element).val(this.resume_time).change();
                                }
                            }
                        }catch (e) {
                        }
                    }
                }
                break;
            case "subtitle_audio_selection_modal":
                // Just select the item without confirming - user must click OK button to confirm
                $(this.subtitle_audio_menus).find('input').prop('checked',false);
                $(this.subtitle_audio_menus[keys.subtitle_audio_selection_modal]).find('input').prop('checked',true);
                break;
            case "subtitle_btn_selection":
                $(this.subtitle_btn_doms[keys.subtitle_btn_selection]).trigger('click');
                break;
        }
    },
    handleMenuLeftRight:function(increment){
        var keys=this.keys;
        if(keys.focused_part==='control_bar' || keys.focused_part==='info_bar' || keys.focused_part==='slider'){
            if(!this.show_control){
                this.seekTo(increment*30);
                return;
            }
        }
        switch (keys.focused_part) {
            case "slider":
                this.seekTo(increment*30);
                this.showControlBar(false);
                break;
            case "control_bar":
                keys.control_bar+=increment;
                if(keys.control_bar<0)
                    keys.control_bar=0;
                if(keys.control_bar>=this.video_control_doms.length)
                    keys.control_bar=this.video_control_doms.length-1;
                this.hoverVideoControlIcon(keys.control_bar);
                break;
            case "info_bar":
                keys.info_bar+=increment;
                if(keys.info_bar<0)
                    keys.info_bar=0;
                if(keys.info_bar>=this.video_info_doms.length)
                    keys.info_bar=this.video_info_doms.length-1;
                this.hoverVideoInfoIcon(keys.info_bar);
                break;
            case "episode_selection":
                $(this.episode_doms).removeClass('active');
                keys.episode_selection+=increment;
                if(keys.episode_selection<0)
                    keys.episode_selection=0;
                if(keys.episode_selection>=this.episode_doms.length)
                    keys.episode_selection=this.episode_doms.length-1;
                this.hoverEpisode(keys.episode_selection);
                break;
            case "subtitle_audio_selection_modal":
                if(increment>0)
                    this.hoverSubtitleBtn(keys.subtitle_btn_selection);
                break;
            case "keys.subtitle_btn_selection":
                if(increment<0)
                    this.hoverSubtitle(keys.subtitle_audio_selection_modal)
                break;
        }
    },
    handleMenuUpDown:function(increment){
        var keys=this.keys;
        if((keys.focused_part==="control_bar" || keys.focused_part==='info_bar' || keys.focused_part==='slider' || keys.focused_part==='episode_selection') && !this.show_control) {
            this.showControlBar(true);
            return;
        }
        switch (keys.focused_part) {
            case 'slider':
                if(increment>0)
                    this.hoverVideoControlIcon(2);
                break;
            case 'control_bar':
                if(increment>0){
                    // keys.prev_focus='info_bar';
                    // this.hoverVideoInfoIcon(0);
                    if(this.has_episodes && increment>0)
                        this.hoverEpisode(keys.episode_selection);
                }else{
                    this.hoverSlider();
                }
                break;
            // case 'info_bar':
            //     if(increment<0)
            //         this.hoverVideoControlIcon(2);
            //     if(this.has_episodes && increment>0)
            //         this.hoverEpisode(keys.episode_selection);
            //     break;
            case 'episode_selection':
                // if(increment<0)
                //     this.hoverVideoInfoIcon(keys.info_bar);
                if(increment<0)
                    this.hoverVideoControlIcon(2);
                break;
            case 'subtitle_audio_selection_modal':
                keys.subtitle_audio_selection_modal+=increment;
                if(keys.subtitle_audio_selection_modal<0)
                    keys.subtitle_audio_selection_modal=0;
                if(keys.subtitle_audio_selection_modal>=this.subtitle_audio_menus.length)
                    keys.subtitle_audio_selection_modal=this.subtitle_audio_menus.length-1;
                this.hoverSubtitle(keys.subtitle_audio_selection_modal);
                break;
            case "subtitle_btn_selection":
                keys.subtitle_btn_selection=increment>0 ? 1 : 0;
                this.hoverSubtitleBtn(keys.subtitle_btn_selection);
                break;
            case 'resume_bar':
                var resume_bar_doms=this.resume_bar_doms;
                keys.resume_bar+=increment;
                if(keys.resume_bar<0)
                    keys.resume_bar=0;
                if(keys.resume_bar>=resume_bar_doms.length)
                    keys.resume_bar=resume_bar_doms.length-1;
                this.hoverResumeBtn(keys.resume_bar);
                break;
        }
    },
    HandleKey:function (e) {
        switch (e.keyCode) {
            case tvKey.MediaFastForward:
                this.seekTo(30);
                break;
            case tvKey.RIGHT:
                this.handleMenuLeftRight(1)
                break;
            case tvKey.MediaRewind:
                this.seekTo(-30);
                break;
            case tvKey.LEFT:
                this.handleMenuLeftRight(-1)
                break;
            case tvKey.DOWN:
                this.handleMenuUpDown(1);
                break;
            case tvKey.UP:
                this.handleMenuUpDown(-1);
                break;
            case tvKey.MediaPause:
                this.playPauseVideo("pause");
                break;
            case tvKey.MediaPlay:
                this.playPauseVideo("play");
                break;
            case tvKey.MediaPlayPause:
                this.playPauseVideo("");
                break;
            case tvKey.ENTER:
                this.handleMenuClick();
                break;
            case tvKey.RETURN:
                this.goBack();
                break;
            case tvKey.YELLOW:
                if(this.current_movie_type==="movies"){
                    if(!current_movie.is_favourite){
                        VodModel.addRecentOrFavouriteMovie(current_movie, 'favourite');
                        current_movie.is_favourite=true;
                    }
                    else{
                        VodModel.removeRecentOrFavouriteMovie(current_movie.stream_id,"favourite");
                        current_movie.is_favourite=false;
                    }
                }
                else{
                    if(!current_series.is_favourite){
                        SeriesModel.addRecentOrFavouriteMovie(current_series, 'favourite');
                        current_series.is_favourite=true;
                    }
                    else{
                        SeriesModel.removeRecentOrFavouriteMovie(current_series.series_id,"favourite");
                        current_series.is_favourite=false;
                    }
                }
                break;
        }
    }
}