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
            console.log(e);
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
            console.log('Save Video Time Issue Here', e);
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
                this.subtitle_loading=false;
                $('#subtitle-loader-container').hide();
                keys.focused_part=keys.prev_focus;
                $('#subtitle-selection-modal').modal('hide');
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
                   <label for="disable-subtitle">Disabled</label>\
                </div>';
        }
        if(platform==='samsung'){
            var language_key="track_lang";
            if(kind!=="TEXT")
                language_key="language";
            items.map(function(item, index){
                var extra_info=item.extra_info;
                htmlContent+=
                    '<div class="setting-modal-option subtitle-item bg-focus"\
                        onmouseenter="vod_series_player_page.hoverSubtitle('+(index+hover_index_move)+')" \
                        onclick="vod_series_player_page.handleMenuClick()" \
                    >\
                        <input class="setting-modal-checkbox" type="checkbox" name="subtitle"  id="disable-subtitle"\
                            value="'+item.index+'"\
                        >\
                        <label for="disable-subtitle">'+extra_info[language_key]+'</label>\
                    </div>';

            })
        }else if(platform==='lg'){
            var default_track_text=kind==="TEXT" ? "Subtitle " : "Track ";
            items.map(function(item,index){
                var language=item.language;
                if(language!=''){
                    language=typeof language_codes[language]!='undefined' ? language_codes[language] : language;
                }else{
                    language=default_track_text+(index+1);
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
                        this.showEmptySubtitleMessage(kind);
                        return;
                    }
                    var that=this;
                    this.subtitle_loading=true;
                    $('#subtitle-selection-modal').modal('show');
                    this.hoverSubtitleBtn(0);
                    $('#subtitle-loader-container').show();
                    var subtitle_request_data;
                    if(this.current_movie_type==='movies'){
                        subtitle_request_data={
                            movie_name:this.current_movie.name
                        }
                        if(this.current_movie.tmdb_id)
                            subtitle_request_data.tmdb_id=this.current_movie.tmdb_id
                    }else {
                        var episode=current_season.episodes[episode_variable.keys.index];
                        subtitle_request_data={
                            movie_name:current_series.name,
                            movie_type:'episode',
                            season_number:current_season.season_number ? current_season.season_number : seasons_variable.keys.index+1,
                            episode_number:episode.episode_num ? episode.episode_num : episode_variable.keys.index+1
                        }
                        if(this.current_movie.info && this.current_movie.info.tmdb_id)
                            subtitle_request_data.tmdb_id=this.current_movie.info.tmdb_id;
                    }
                    $.ajax({
                        method:'post',
                        url:'https://exoapp.tv/api/get-subtitles',
                        data: subtitle_request_data,
                        dataType:'json',
                        success:function (result) {
                            that.subtitle_loading=false;
                            that.subtitle_loaded=true;
                            $('#subtitle-loader-container').hide();
                            if(result.status==='success'){
                                if(result.subtitles.length>0){
                                    media_player.subtitles= result.subtitles;
                                    that.renderSubtitles(kind, media_player.subtitles);
                                }
                                else{
                                    media_player.subtitles=[];
                                    that.showEmptySubtitleMessage(kind);
                                }
                            }
                        },
                        error:function (error){
                            that.subtitle_loading=false;
                            that.subtitle_loaded=true;
                            $('#subtitle-loader-container').hide();
                            that.showEmptySubtitleMessage(kind);
                        }
                    })
                }
                else {
                    if(media_player.subtitles.length>0) {
                        this.renderSubtitles(kind, media_player.subtitles);
                    }else
                        this.showEmptySubtitleMessage(kind);
                }
            }else {
                subtitles=media_player.getSubtitleOrAudioTrack(kind);
                if(subtitles.length>0)
                    this.renderSubtitles(kind, subtitles)
                else{
                    if(kind==="TEXT")
                        showToast("Sorry","No Subtitles exists");
                    else
                        showToast("Sorry","No Audios exists");
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
                console.log(e);
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
        var that=this;
        this.hideControlBar();
        if(kind=="TEXT")
            $("#subtitle-modal-title").text("Subtitle");
        else
            $("#subtitle-modal-title").text("Audio Track");
        this.keys.focused_part="subtitle_audio_selection_modal";
        $('#subtitle-selection-modal').find('.modal-operation-menu-type-2').removeClass('active');
        var htmlContent=this.makeMediaTrackElement(subtitles, kind);
        $("#subtitle-selection-container").html(htmlContent);
        $('#subtitle-selection-modal').modal('show');
        var subtitle_menus=$('#subtitle-selection-modal .subtitle-item');
        this.subtitle_audio_menus=subtitle_menus;
        $(subtitle_menus[0]).find('input').prop('checked',true);
        this.hoverSubtitle(0);
        var diff_index=kind==='TEXT' ? 1 : 0;
        var current_selected_index=kind==="TEXT" ? this.current_subtitle_index : this.current_audio_track_index;
        subtitles.map(function(item, index){
            var index1=platform==='samsung' ? item.index : index
            if(index1==current_selected_index){
                $(subtitle_menus).find('input').prop('checked',false);
                $(subtitle_menus[index+diff_index]).find('input').prop('checked',true);
                that.hoverSubtitle(index+diff_index);
            }
        });
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
    cancelSubtitle:function(){
        $('#subtitle-selection-modal').modal('hide');
        this.keys.focused_part=this.keys.prev_focus;
    },
    confirmSubtitle:function(){
        var modal_title=$("#subtitle-modal-title").text();
        var kind=modal_title.toLowerCase().includes('subtitle') ? 'TEXT' : 'AUDIO';
        $('#subtitle-selection-modal').modal('hide');
        this.keys.focused_part=this.keys.prev_focus;
        if(platform!=='samsung' && kind==='TEXT'){
            if(media_player.subtitles.length<0)
                return;
        }
        if(modal_title.toLowerCase().includes('subtitle')){
            this.current_subtitle_index=$('#subtitle-selection-modal').find('input[type=checkbox]:checked').val();
            try{
                if(this.current_subtitle_index==-1){
                    this.show_subtitle=false;
                    $("#vod-series-player-page").find('.subtitle-container').css({visibility:'hidden'});
                    if(platform!="samsung"){
                        SrtOperation.deStruct();
                    }
                    return;
                }
                this.show_subtitle=true;
                media_player.setSubtitleOrAudioTrack("TEXT",parseInt(this.current_subtitle_index));
                $("#vod-series-player-page").find('.subtitle-container').css({visibility:'visible'});
            }catch(e){
            }
            console.log(this.current_subtitle_index);
        }
        else{
            this.current_audio_track_index=$('#subtitle-selection-modal').find('input[type=checkbox]:checked').val();
            try{
                media_player.setSubtitleOrAudioTrack("AUDIO",parseInt(this.current_audio_track_index))
            }catch(e){

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
        var keys=this.keys;
        keys.focused_part="subtitle_audio_selection_modal";
        $(this.subtitle_audio_menus).removeClass('active');
        $(this.subtitle_btn_doms).removeClass('active');
        keys.subtitle_audio_selection_modal=index;
        moveScrollPosition($('#subtitle-selection-container'),this.subtitle_audio_menus[keys.subtitle_audio_selection_modal],'vertical',false);
        $(this.subtitle_audio_menus[keys.subtitle_audio_selection_modal]).addClass('active');
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