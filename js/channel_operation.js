"use strict";
var channel_page={
    current_channel_id:0,
    full_screen_timer:null,
    progressbar_timer:null,
    player:null,
    channel_number_timer:null,
    channel_num:0,
    movies:[],
    initiated:false,
    categories:[],
    current_category_index:0,
    category_hover_timer:null,
    category_hover_timeout:300,
    current_channel_epg_id:null,
    current_channel_epg_timer:null,
    current_channel_epg_timeout:300,
    keys:{
        focused_part:"category_selection",
        category_selection:0,
        channel_selection:0,
        channel_footer_selection:0,
        prev_focus:'',
        video_control:0,
        epg_selection:0,
        channel_info_selection:0
    },
    category_doms:[],
    channel_doms:[],
    video_control_doms:$('#channel-page .video-control-icon-wrapper'),
    play_icon_index:1,
    filtered_movies:[],
    next_programme_timer:null,
    current_channel_programmes:[],
    hover_channel_programmes:[],
    short_epg_limit_count:30,
    prev_focus_dom:null,
    next_channel_timer:null,
    prev_keyword:'',
    slider_element:$('#channel-video-progressbar-container .video-progress-bar-slider')[0],
    epg_programmes:[],
    epg_doms:[],
    channel_footer_doms:$('#channel-page .info-icon-container'),
    favourite_changed:false,
    prev_route:'',
    current_program:null,
    hover_channel_epg_timer:null,
    hover_channel_epg_timeout:400,
    hover_channel_epg_id:null,
    
    // EPG Caching System
    epg_cache: new Map(),
    cache_duration: 30 * 60 * 1000, // 30 minutes
    batch_fetch_timer: null,
    active_timers: [],
    last_program_check: new Map(), // Track last program end times for smart refresh
    preload_queue: [],
    max_concurrent_preloads: 3,
    current_preloads: 0,
    


    init:function (channel, focus_play_btn, prev_route) {
        this.current_program=null;
        this.current_channel=null;
        this.epg_channel_id=null;
        this.prev_route=prev_route;
        this.favourite_changed=false;
        var keys=this.keys;
        this.prev_focus_dom=null;
        $('#channel-category-page').addClass('hide');
        $("#channel-page").removeClass('hide');
        current_route="channel-page";

        // Initialize XMLTV Manager for async EPG loading
        this.initializeXmltvManager();

        var categories=LiveModel.getCategories(false, true);
        this.categories=categories;
        var html='';
        categories.map(function (item,index) {
            html+=
                '<div class="channel-page-category-item video-pop-up-item-wrapper bg-focus"\
                    onmouseenter="channel_page.hoverCategory(this)"\
                    onclick="channel_page.handleMenuClick()"\
                    data-index="'+index+'"\
                >\
                    <span class="video-pop-up-item-number">'+(index+1)+'</span> \
                    <img class="video-pop-up-item-icon" src="images/grid.png"/>\
                    <span class="channel-category-name video-pop-up-item-name">'+item.category_name+'</span>\
                    <span class="video-pop-up-counts-wrapper">\
                        <span class="channel-category-movie-counts video-pop-up-counts">'+item.movies.length+'</span>\
                        <span class="video-pop-up-counts-label" data-word_code="channels">Channels</span>\
                    </span>\
                </div>';
        })
        $('#channel-page-categories-container').html(html);
        this.category_doms=$('.channel-page-category-item');
        var current_category_index=0, current_category=channel_category_page.current_category;
        for(var i=0;i<categories.length;i++){
            if(categories[i].category_id===current_category.category_id){
                current_category_index=i;
                break;
            }
        }
        this.current_category_index=current_category_index;
        keys.category_selection=current_category_index;
        this.movies=current_category.movies;
        this.showMovie(channel);
        this.showFullScreenInfo();
        if(focus_play_btn)
            this.hoverVideoControl(1);
        else
            this.hoverVideoControl(this.keys.video_control);

        keys.channel_selection=(channel_category_page.channel_current_page-1)*channel_category_page.channel_count_per_page
            +channel_category_page.keys.channel_selection;
        $('#channel-item-modal .video-pop-up-header-title').text(current_category.category_name);
        this.renderCategoryChannel();
    },

    // Initialize XMLTV Manager for async EPG loading
    initializeXmltvManager: function() {
        var that = this;
        
        // Initialize XMLTV Manager if not already done
        if (!XmltvManager.isInitialized) {
            XmltvManager.init();
        }
        
        // Register callback for EPG updates
        XmltvManager.onEpgUpdate(function(channelId, programmes) {
            if (channelId === '__PARSING_COMPLETE__') {
                console.log('XMLTV parsing completed');
                return;
            }
            
            // Update UI for this channel
            that.updateChannelEpgFromXmltv(channelId, programmes);
        });
        
        console.log('Channel page: XMLTV Manager initialized');
    },

    // Update channel EPG display from XMLTV data
    updateChannelEpgFromXmltv: function(channelId, programmes) {
        // Update channel list EPG displays
        var epgElement = $('[data-channel-epg="' + channelId + '"]');
        if (epgElement.length > 0) {
            var currentProgramme = this.getCurrentProgrammeFromXmltv(programmes);
            var epgText = currentProgramme ? getAtob(currentProgramme.title) : 'No Information';
            epgElement.text(epgText);
        }
        
        // Update current channel if it matches
        if (this.current_channel_id === channelId) {
            this.current_channel_programmes = programmes;
            this.updateNextProgrammes();
        }
        
        // Update hover channel if it matches
        if (this.hover_channel_epg_id === channelId) {
            this.hover_channel_programmes = programmes;
            this.showNextProgrammes(true);
        }
    },

    // Get current programme from XMLTV data
    getCurrentProgrammeFromXmltv: function(programmes) {
        if (!programmes || programmes.length === 0) return null;
        
        var now = moment().unix();
        for (var i = 0; i < programmes.length; i++) {
            var programme = programmes[i];
            var startTime = moment(programme.start).unix();
            var endTime = moment(programme.stop).unix();
            
            if (startTime <= now && now < endTime) {
                return programme;
            }
        }
        
        return null;
    },
    goBack:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "video_control":
                var display_info=$('#channel-info-modal').css('block')
                if(display_info==='block'){
                    $('#channel-info-modal').hide();
                    return;
                }
                this.hideFullScreenInfo();
                break;
            case "full_screen":
                this.Exit();
                break;
            case "category_selection":
            case "channel_selection":
            case "channel_footer_selection":
                $('.video-pop-up').hide();
                keys.focused_part="full_screen";
                break;
            case "epg_selection":
                $('.video-pop-up').hide();
                $('#channel-item-modal').show();
                this.hoverChannel(keys.channel_selection);
                break;
        }
    },
    Exit:function () {
        try{
            media_player.close();
        }
        catch(e){
            console.log(e);
        }
        $("#channel-page").addClass('hide');
        
        this.clearAllTimers();
        
        current_route=this.prev_route;
        if(this.prev_route==='channel-category-page'){
            $('#channel-category-page').removeClass('hide');
            channel_category_page.updateForFavouriteOrRecentCategory();
        }else if(this.prev_route==='search-page')
            $('#search-page').show();
    },
    showCategoryChannels:function(){
        var keys=this.keys;
        if(this.current_category_index!=keys.category_selection){
            var categories=this.categories;
            var category=categories[keys.category_selection];
            this.movies=category.movies;
            this.renderCategoryChannel();
            $('#channel-item-modal .video-pop-up-header-title').text(category.category_name);
            this.current_category_index=keys.category_selection;
            keys.channel_selection=0;
        }
        this.showChannelModal();
    },
    renderCategoryChannel:function (){
        var that = this;
        var htmlContents='';
        var favourite_ids=LiveModel.favourite_ids;
        if(this.movies.length==0){
            htmlContents='<div class="video-pop-up-empty-msg">Sorry, No Channels Exists</div>'
            $('#channel-page-menu-container').html(htmlContents);
            this.channel_doms=[];
            return;
        }
        
        this.movies.map(function(movie, index){
            var is_favourite=favourite_ids.includes(movie.stream_id);
            var epg_text = 'Loading...';
            
            // Check XMLTV Manager first for EPG data
            var xmltvData = XmltvManager.getChannelEpg(movie.stream_id);
            if(xmltvData && xmltvData.programmes) {
                var current_program = that.getCurrentProgrammeFromXmltv(xmltvData.programmes);
                if(current_program) {
                    epg_text = getAtob(current_program.title);
                } else {
                    epg_text = 'No Information';
                }
            } else {
                // Fallback to legacy cache system
                var cached_data = that.getCachedEpg(movie.stream_id);
                if(cached_data && !that.shouldRefreshEpg(movie.stream_id, cached_data)) {
                    var current_program = that.getCurrentProgramFromCache(cached_data.programmes);
                    if(current_program) {
                        epg_text = getAtob(current_program.title);
                    } else {
                        epg_text = 'No Information';
                    }
                }
            }
            
            htmlContents+=
                '<div class="channel-menu-item video-pop-up-item-wrapper bg-focus"\
                   data-index="'+index+'"\
                   data-channel-id="'+movie.stream_id+'"\
                   onmouseenter="channel_page.hoverChannel(this)"\
                   onclick="channel_page.handleMenuClick()"\
                >\
                    <span class="video-pop-up-item-number">'+(index+1)+'</span>\
                    <img class="video-pop-up-item-icon" src="'+movie.stream_icon+'" onerror="this.src=\''+default_movie_icon+'\'">'+'</span>'+'\
                    <i class="fa fa-heart favourite-icon '+(is_favourite ? 'favourite' : '')+'"></i>\
                    <span class="video-pop-up-item-name">'+movie.name+'</span>'+
                '<span class="video-pop-up-counts-wrapper epg-txt-color" data-channel-epg="'+movie.stream_id+'">\
                    '+epg_text+'\
                </span>\
            </div>'
        })
        $('#channel-page-menu-container').html(htmlContents);
        this.channel_doms=$('#channel-page-menu-container .channel-menu-item');
        
        // XMLTV Manager handles all EPG loading - no individual requests needed
        console.log('Channel list rendered with XMLTV EPG data');
    },
    goChannelNum:function(new_value){
        var channel_num=this.channel_num;
        if(channel_num!=0 ||(channel_num==0 && new_value!=0)){
            channel_num=channel_num*10+new_value;
            this.channel_num=channel_num;
            clearTimeout(this.channel_number_timer);
            var that=this;
            $('#typed-channel-number').text(channel_num);
            this.channel_number_timer=setTimeout(function(){  // go to channel number
                var movies=that.movies;
                var movie_exist=false;
                for(var i=0;i<movies.length;i++){
                    if(movies[i].num===that.channel_num){
                        movie_exist=true;
                        current_movie=movies[i];
                        that.showMovie(current_movie)
                        that.current_channel_id=current_movie.stream_id;
                        that.hoverChannel(that.channel_doms[i]);
                        that.keys.focused_part='full_screen';
                        that.showFullScreenInfo();
                        break;
                    }
                }
                if(!movie_exist){
                    showToast("Sorry","Channel does not exist");
                }
                that.channel_num=0;
                $('#typed-channel-number').text("");
            },2000);
        }
    },
    addOrRemoveFav:function(){
        var keys=this.keys;
        if(keys.focused_part!=='channel_selection' && keys.focused_part!='video_control' && keys.focused_part!='channel_footer_selection')
            return;
        var current_movie=this.movies[keys.channel_selection];
        var action='add';
        if(LiveModel.favourite_ids.includes(current_movie.stream_id))
            action='remove';
        if(action==='add'){
            LiveModel.addRecentOrFavouriteMovie(current_movie,'favourite');  // add to favourite movie
            $(this.channel_doms[keys.channel_selection]).find('.favourite-icon').addClass('favourite');
        }
        else{
            var current_category=this.categories[this.current_category_index];
            LiveModel.removeRecentOrFavouriteMovie(current_movie.stream_id,'favourite');
            $(this.channel_doms[keys.channel_selection]).find('.favourite-icon').removeClass('favourite');
            if(current_category.category_id==='favourite'){
                $(this.channel_doms[keys.channel_selection]).remove();
                var channel_doms=$('#channel-page-menu-container .channel-menu-item');
                this.channel_doms=channel_doms;
                if(channel_doms.length==0){
                    // this.hoverCategory(keys.category_selection);
                    this.renderCategoryChannel();
                }else{
                    if(keys.channel_selection>=channel_doms.length)
                        keys.channel_selection=channel_doms.length-1;
                    if(keys.focused_part==='channel_selection')
                        this.hoverChannel(keys.channel_selection);
                }
            }
        }
        if(keys.focused_part==='video_control' || current_movie.stream_id===this.current_channel_id)
            $(this.video_control_doms[3]).toggleClass('favourite');
        try{
            var favourite_category_position=LiveModel.getRecentOrFavouriteCategoryPosition('favourite');
            var favourite_movies_count=LiveModel.getRecentOrFavouriteCategory('favourite').movies.length;
            $(this.category_doms[favourite_category_position]).find('.channel-category-movie-counts').text(favourite_movies_count)
        }catch (e) {
        }
        this.favourite_changed=true;
    },
    showNextProgrammes:function (is_hover_channel){
        var keys=this.keys;
        if(is_hover_channel && keys.focused_part!=='channel_selection')
            return;
        var slider_element=this.slider_element;
        var progress_start=0, progress_end=100, current_progress=100;
        var total_programmes=!is_hover_channel ? this.current_channel_programmes : this.hover_channel_programmes;

        var temp=LiveModel.getNextProgrammes(total_programmes);
        var current_program_exist=temp.current_program_exist;

        var programmes=temp.programmes;
        var current_program,next_program, current_program_title="No Info",
            current_program_time='', next_program_title="No Info", next_program_time='';
        var format_text=settings.time_format==='24' ? 'HH:mm' : 'hh:mm A';
        if(current_program_exist){
            current_program=programmes[0];
            if(!is_hover_channel){
                this.current_program=programmes[0];
                progress_start=getLocalChannelTime(current_program.start).unix();
                progress_end=getLocalChannelTime(current_program.stop).unix();
                current_progress=moment().unix();
                if(programmes.length>1)
                    next_program=programmes[1];
            }
        }
        else{
            if(!is_hover_channel && programmes.length>0){
                next_program=programmes[0];
            }
        }
        if(current_program){
            current_program_title=getAtob(current_program.title);
            if(!is_hover_channel)
                current_program_time=getLocalChannelTime(current_program.start).format(format_text)+' ~ '+getLocalChannelTime(current_program.stop).format(format_text);
        }
        if(!is_hover_channel){
            if(next_program){
                next_program_title=getAtob(next_program.title);
                next_program_time=getLocalChannelTime(next_program.start).format(format_text)+' ~ '+getLocalChannelTime(next_program.stop).format(format_text);
            }
            $('.full-screen-program-name.current').text(current_program_title);
            $('.full-screen-program-time.current').text(current_program_time);
            $('.full-screen-program-name.next').text(next_program_title);
            $('.full-screen-program-time.next').text(next_program_time);
            $(slider_element).attr({
                min:progress_start,
                max:progress_end
            })
            $(slider_element).rangeslider({
                polyfill: false,
                rangeClass: 'rangeslider'
            })
            $(slider_element).rangeslider('update', true);
            $(slider_element).val(current_progress).change();
            $(slider_element).rangeslider('update');
        }
        else{
            if(!current_program)
                current_program_title='No Information';
            $(this.channel_doms[keys.channel_selection]).find('.video-pop-up-counts-wrapper').text(current_program_title);
        }
    },
    updateNextProgrammes:function(){
        this.showNextProgrammes(false);
        this.showNextProgrammes(true);
        if(this.next_programme_timer){
            clearInterval(this.next_programme_timer);
            this.next_programme_timer=null;
        }
        var that=this;
        this.next_programme_timer=setInterval(function () {
            that.showNextProgrammes(false);
            that.showNextProgrammes(true);
        },60000);
        
        this.addTimer(this.next_programme_timer, 'next_programme');
    },
    getCurrentChannelProgrammes:function(is_hover_channel){
        var that=this;
        var programmes=[];
        if(!is_hover_channel)
            this.current_channel_programmes=[];
        else
            this.hover_channel_programmes=[];
            
        var channel_id;
        if(!is_hover_channel)
            channel_id=this.current_channel_id;
        else
            channel_id=this.movies[this.keys.channel_selection].stream_id;
            
        // Try to get EPG data from XMLTV Manager first
        var xmltvData = XmltvManager.getChannelEpg(channel_id);
        if(xmltvData && xmltvData.programmes) {
            programmes = xmltvData.programmes;
            if(!is_hover_channel)
                this.current_channel_programmes=programmes;
            else{
                this.hover_channel_programmes=programmes;
                this.hover_channel_epg_id=channel_id;
            }
            that.showNextProgrammes(is_hover_channel);
            if(!is_hover_channel) {
                that.updateNextProgrammes();
            }
            return;
        }
        
        // Fallback to legacy cache system for compatibility
        var cached_data = this.getCachedEpg(channel_id);
        if(cached_data && !this.shouldRefreshEpg(channel_id, cached_data)){
            programmes = cached_data.programmes;
            if(!is_hover_channel)
                this.current_channel_programmes=programmes;
            else{
                this.hover_channel_programmes=programmes;
                this.hover_channel_epg_id=channel_id;
            }
            that.showNextProgrammes(is_hover_channel);
            if(!is_hover_channel) {
                that.updateNextProgrammes();
            }
            return;
        }
        
        // Show loading state while XMLTV loads in background
        that.showNextProgrammes(is_hover_channel);
        
        // XMLTV Manager handles all EPG fetching - no individual API calls needed
        console.log('EPG data loading for channel ' + channel_id + ' via XMLTV Manager');
        
        // Start XMLTV fetch if not already loading (non-blocking)
        if (settings.playlist_type === 'xtreme' && !XmltvManager.isLoading) {
            XmltvManager.fetchXmltvAsync(false);
        }
        
        // Set up a timeout to update UI once XMLTV data becomes available
        setTimeout(function() {
            var updatedXmltvData = XmltvManager.getChannelEpg(channel_id);
            if(updatedXmltvData && updatedXmltvData.programmes) {
                programmes = updatedXmltvData.programmes;
                if(!is_hover_channel)
                    that.current_channel_programmes=programmes;
                else{
                    that.hover_channel_programmes=programmes;
                    that.hover_channel_epg_id=channel_id;
                }
                that.showNextProgrammes(is_hover_channel);
                if(!is_hover_channel) {
                    that.updateNextProgrammes();
                }
            }
        }, 2000); // Check again after 2 seconds for XMLTV data
    },
    showFullScreenInfo:function(){
        $('#full-screen-information').slideDown();
        this.keys.focused_part='video_control';
        var that=this;
        clearTimeout(this.full_screen_timer);
        this.full_screen_timer=setTimeout(function () {
            that.hideFullScreenInfo();
        },5000);
        
        this.addTimer(this.full_screen_timer, 'full_screen_info');
    },
    hideFullScreenInfo:function(){
        var keys=this.keys;
        $('#full-screen-information').slideUp();
        $('#channel-info-modal').hide();
        if(keys.focused_part==='video_control')
            keys.focused_part='full_screen';
    },
    showMovie:function(current_movie){
        this.current_program=null;
        var url,movie_id=current_movie.stream_id;
        if(settings.playlist_type==='xtreme')
            url=getMovieUrl(movie_id,'live','ts');
        else if(settings.playlist_type==='type1')
            url=current_movie.url;
        try{
            media_player.close();
        }catch(e){
        }
        media_player.init("channel-page-video","channel-page")
        try{
            media_player.playAsync(url);
        }catch (e) {
        }
        changePlayerStateIcon(this.video_control_doms[1],true)
        this.current_channel_id=movie_id;
        $('.full-screen-channel-name').text(current_movie.name);
        $('.full-screen-channel-logo').attr('src',current_movie.stream_icon);
        var is_adult=checkForAdult(current_movie,'movie',LiveModel.categories)
        if(!is_adult)
            LiveModel.addRecentOrFavouriteMovie(current_movie,'recent');
        var that=this;
        if(this.current_channel_epg_timer){
            clearTimeout(this.current_channel_epg_timer);
            this.current_channel_epg_timer=null;
        }
        this.current_channel_epg_timer=setTimeout(function () {
            that.getCurrentChannelProgrammes(false);
        },this.current_channel_epg_timeout);
        
        this.addTimer(this.current_channel_epg_timer, 'current_channel_epg', movie_id);

        if(LiveModel.favourite_ids.includes(current_movie.stream_id))
            $(this.video_control_doms[3]).addClass('favourite');
        else
            $(this.video_control_doms[3]).removeClass('favourite');
        var slider_element=this.slider_element;
        $(slider_element).attr({
            min:0,
            max:100
        })
        $(slider_element).rangeslider({
            polyfill: false,
            rangeClass: 'rangeslider'
        })
        $(slider_element).val(100).change();
        $(slider_element).rangeslider('update');
    },
    showNextChannel:function(increment){
        $('#channel-info-modal').hide();
        var keys=this.keys;
        keys.channel_selection+=increment;
        if(keys.channel_selection<0){
            keys.channel_selection=0;
            return;
        }
        if(keys.channel_selection>=this.movies.length){
            keys.channel_selection=this.movies.length-1;
            return;
        }
        var that=this;
        clearTimeout(this.next_channel_timer);
        this.next_channel_timer=setTimeout(function () {
            var movie=that.movies[keys.channel_selection]
            that.current_channel_id=movie.stream_id;
            that.showMovie(that.movies[keys.channel_selection]);
            that.showFullScreenInfo();
        },200);
        
        this.addTimer(this.next_channel_timer, 'next_channel', this.movies[keys.channel_selection].stream_id);
    },
    playOrPause:function(){
        if(media_player.state==media_player.STATES.PLAYING){
            try{
                changePlayerStateIcon(this.video_control_doms[1],false)
                media_player.pause();
            }catch(e){
            }
        }else{
            try{
                changePlayerStateIcon(this.video_control_doms[1],true)
                media_player.play();
            }catch (e) {
            }
        }
    },
    showCategoryModal:function (){
        $('#channel-category-modal').show();
        this.hoverCategory(this.keys.category_selection);
    },
    showChannelModal:function (){
        var keys=this.keys;
        $('.video-pop-up').hide();
        $('#channel-item-modal').show();
        this.hoverChannel(keys.channel_selection);
        this.hideFullScreenInfo();
    },
    showEpgModal:function (){
        var that=this;
        var programmes=[];
        if(this.movies.length==0){
            showToast('Sorry','No selected channel')
            return;
        }
        var movie=this.movies[this.keys.channel_selection];
        $('.video-pop-up').hide();
        this.keys.focused_part='epg_selection';
        this.epg_doms=[];
        if(settings.playlist_type==='xtreme'){
            $('#channel-epg-items-container').html(
                '<div class="channel-epg-loader">\
                    <img src="images/loader.gif">\
                    <div class="channel-epg-loading-txt">Loading Epg...</div> \
                </div>'
            )
            $('#channel-epg-modal').show();
            var format_text='Y-MM-DD HH:mm';
            this.is_loading=true;
            showLoader(true);

            // Use XMLTV Manager instead of individual API call
            var xmltvData = XmltvManager.getChannelEpg(movie.stream_id);
            
            // Process XMLTV data if available
            if(xmltvData && xmltvData.programmes && xmltvData.programmes.length > 0){
                that.processEpgDataForModal(xmltvData.programmes, movie);
            } else {
                // If XMLTV data not available yet, try to fetch it
                if (!XmltvManager.isLoading) {
                    XmltvManager.fetchXmltvAsync(false);
                }
                
                // Set up callback to handle data when it arrives
                var checkDataTimer = setInterval(function() {
                    var updatedXmltvData = XmltvManager.getChannelEpg(movie.stream_id);
                    if(updatedXmltvData && updatedXmltvData.programmes && updatedXmltvData.programmes.length > 0) {
                        clearInterval(checkDataTimer);
                        that.processEpgDataForModal(updatedXmltvData.programmes, movie);
                    }
                }, 1000);
                
                // Timeout after 10 seconds if no data
                setTimeout(function() {
                    clearInterval(checkDataTimer);
                    if(!that.epg_doms || that.epg_doms.length === 0) {
                        that.showEmptyEpg();
                    }
                }, 10000);
            }
        }else
            that.showEmptyEpg();
    },
    
    processEpgDataForModal:function(epgListings, movie) {
        var that = this;
        var programmes = [];
        var epg_selection = 0;
        var archive = movie.tv_archive == 1 ? true : false;
        var html = '';
        var temp_date = 'adfd';
        var current_time = moment().unix();
        var today = moment().format('Y-MM-DD');
        var current_time_exceed = false;
        var format_text = 'Y-MM-DD HH:mm';

        epgListings.map(function (item, index) {
            var start = getLocalChannelTime(item.start);
            var stop = getLocalChannelTime(item.stop);
            var title = getAtob(item.title);
            var start_time = start.format(format_text);
            var stop_time = stop.format(format_text);
            
            programmes.push({
                start: start_time,
                stop: stop_time,
                title: title,
                description: item.description || ''
            });
            
            if(!start_time.includes(temp_date)){
                html += '<div class="epg-date-label">'+start_time.substr(0,10)+'</div>';
                temp_date = start_time.substr(0,10);
            }
            
            var epg_available = 0, epg_html = '';
            if(!current_time_exceed){
                if(temp_date <= today){
                    var stop_unix = stop.unix();
                    var start_unix = start.unix();
                    if(stop_unix <= current_time){
                        if(archive){
                            epg_html = '<img class="channel-epg-available-icon" src="images/clock.png">';
                            epg_available = 1;
                        }
                    }
                    if(stop_unix >= current_time){
                        if(start_unix <= current_time){
                            epg_selection = index;
                        }
                        current_time_exceed = true;
                    }
                }else{
                    current_time_exceed = true;
                }
            }
            
            html += 
                '<div class="epg-item-wrapper bg-focus" data-epg_available="'+epg_available+'"\
                    onmouseenter="channel_page.hoverEpgItem('+index+')" \
                    onclick="channel_page.handleMenuClick()" \
                >\
                    <div class="epg-time-wrapper">'+
                        start_time.substr(11)+' : '+stop_time.substr(11)+
                    '</div>'+
                    epg_html+
                    '<div class="epg-item-name">'+title+'</div>\
                </div>';
        });
        
        $('#channel-epg-items-container').html(html);
        that.epg_doms = $('.epg-item-wrapper');
        $('#channel-epg-container').show();
        that.hoverEpgItem(epg_selection);

        that.is_loading = false;
        showLoader(false);
        that.epg_programmes = programmes;
    },
    showEmptyEpg:function (){
        this.is_loading=false;
        showLoader(false);
        $('#channel-epg-items-container').html(
            '<div class="video-pop-up-empty-msg">Sorry, No Epg Available for Selected Channel</div>\
            '
        )
        $('#channel-epg-modal').show();
        this.epg_doms=[];
    },
    showChannelInfo:function (){
        $('#channel-info-modal').show();
        var channel_desc='N/A';
        if(this.current_program)
            channel_desc=getAtob(this.current_program.description);
        $('#channel_info_desc').text(channel_desc);
        this.showFullScreenInfo();
    },
    handleChKey:function (increment){
        var keys=this.keys;
        switch (keys.focused_part){
            case "category_selection":
                if(this.category_doms.length==0)
                    return;
                keys.category_selection+=increment*10;
                if(keys.category_selection<0)
                    keys.category_selection=0;
                if(keys.category_selection>=this.category_doms.length)
                    keys.category_selection=this.category_doms.length-1;
                this.hoverCategory(keys.category_selection);
                break;
            case "channel_selection":
                if(this.channel_doms.length==0)
                    return;
                keys.channel_selection+=increment*10;
                if(keys.channel_selection<0)
                    keys.channel_selection=0;
                if(keys.channel_selection>=this.channel_doms.length)
                    keys.channel_selection=this.channel_doms.length-1;
                this.hoverChannel(keys.channel_selection);
                break;
            case "full_screen":
            case "video_control":
                this.showNextChannel(increment);
                break;
        }
    },
    handleBlueKeyEvent:function (){
        var keys=this.keys;
        if(keys.focused_part==='channel_selection' || keys.focused_part==='channel_footer_selection'){
            $('.video-pop-up').hide();
            $('#channel-category-modal').show();
            this.hoverCategory(keys.category_selection);
        }
        else if(keys.focused_part==='full_screen' || keys.focused_part==='video_control'){
            this.hideFullScreenInfo();
            this.showCategoryModal();
        }
    },
    handleGreenKeyEvent:function (){
        var keys=this.keys;
        if(keys.focused_part==='channel_selection' || keys.focused_part==='channel_footer_selection')
            this.showEpgModal();
        else if(keys.focused_part==='full_screen' || keys.focused_part==='video_control'){
            try{
                media_player.close();
            }
            catch(e){
                console.log(e);
            }
            $("#channel-page").addClass('hide');
            clearInterval(this.progressbar_timer);
            clearTimeout(this.full_screen_timer);
            clearTimeout(this.next_channel_timer);
            vod_series_page.init('vod');
        }
    },
    hoverChannelFooterItem:function (index){
        var keys=this.keys;
        keys.focused_part="channel_footer_selection";
        keys.channel_footer_selection=index;
        $(this.prev_focus_dom).removeClass('active');
        $(this.channel_footer_doms[index]).addClass('active');
        this.prev_focus_dom=this.channel_footer_doms[index];
    },
    hoverCategory:function(index){
        var keys=this.keys;
        keys.focused_part="category_selection";
        if(typeof index=='number')
            keys.category_selection=index;
        else
            keys.category_selection=$(index).data('index');
        $(this.prev_focus_dom).removeClass('active');
        $(this.category_doms[keys.category_selection]).addClass('active');
        this.prev_focus_dom=this.category_doms[keys.category_selection];
        moveScrollPosition($('#channel-page-categories-container'),this.category_doms[keys.category_selection],'vertical',false);
    },
    hoverChannel:function(index){
        var keys=this.keys;
        keys.focused_part="channel_selection";
        if(typeof index=='number')
            keys.channel_selection=index;
        else
            keys.channel_selection=$(index).data('index');
        $(this.prev_focus_dom).removeClass('active');
        $(this.channel_doms[keys.channel_selection]).addClass('active');
        this.prev_focus_dom=this.channel_doms[keys.channel_selection];
        moveScrollPosition($('#channel-page-menu-container'),this.channel_doms[keys.channel_selection],'vertical',false);
        var channel=this.movies[keys.channel_selection];
        if(settings.playlist_type==='xtreme' && channel.stream_id!=this.hover_channel_epg_id){
            if(this.hover_channel_epg_timer){
                clearTimeout(this.hover_channel_epg_timer);
                this.hover_channel_epg_timer=null;
            }
            var that=this;
            this.hover_channel_epg_timer=setTimeout(function (){
                that.getCurrentChannelProgrammes(true);
            },this.hover_channel_epg_timeout);
            
            this.addTimer(this.hover_channel_epg_timer, 'hover_channel_epg', channel.stream_id);
        }
    },
    hoverVideoControl:function (index){
        var keys=this.keys;
        keys.focused_part='video_control';
        keys.video_control=index;
        $(this.video_control_doms).removeClass('active');
        $(this.video_control_doms[index]).addClass('active');
        this.showFullScreenInfo();
    },
    hoverEpgItem:function (index){
        var keys=this.keys;
        keys.focused_part='epg_selection';
        keys.epg_selection=index;
        $(this.epg_doms).removeClass('active');
        $(this.epg_doms[index]).addClass('active');
        moveScrollPosition($('#channel-epg-items-container'),this.epg_doms[index],'vertical',true);
    },
    handleMenuClick:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "category_selection":
                var category=this.categories[keys.category_selection];
                var is_adult=checkForAdult(category,'category',[]);
                if(is_adult){
                    parent_confirm_page.init(current_route);
                    return;
                }
                this.showCategoryChannels();
                break;
            case "video_control":
                $(this.video_control_doms[keys.video_control]).trigger('click');
                break;
            case "full_screen":
                this.showChannelModal();
                break;
            case "channel_selection":
                $('.video-pop-up').hide();
                var stream_id=this.movies[keys.channel_selection].stream_id;
                if(this.current_channel_id!=stream_id)
                    this.showMovie(this.movies[keys.channel_selection]);
                this.showFullScreenInfo();
                break;
            case "channel_footer_selection":
                $(this.channel_footer_doms[keys.channel_footer_selection]).trigger('click');
                break;
        }
    },
    handleMenusUpDown:function(increment) {
        var keys=this.keys;
        var menus=this.channel_doms;
        switch (keys.focused_part) {
            case "category_selection":
                var prev_selection=keys.category_selection;
                keys.category_selection+=increment;
                if(keys.category_selection<0){
                    keys.category_selection=0;
                    return;
                }
                if(keys.category_selection>=this.category_doms.length){
                    keys.category_selection=this.category_doms.length-1;
                    return;
                }
                this.hoverCategory(keys.category_selection);
                break;
            case "channel_selection":
                if(this.channel_doms.length==0)
                    return;
                keys.channel_selection+=increment;
                if(keys.channel_selection>=menus.length){
                    keys.channel_selection=menus.length-1;
                    this.hoverChannelFooterItem(0);
                    return;
                }
                if(keys.channel_selection<0){
                    keys.channel_selection=0;
                    return;
                }
                this.hoverChannel(keys.channel_selection);
                break;
            case "channel_footer_selection":
                if(increment<0 && this.channel_doms.length>0)
                    this.hoverChannel(keys.channel_selection);
                break;
            case "epg_selection":
                if(this.epg_doms.length==0)
                    return;
                keys.epg_selection+=increment;
                if(keys.epg_selection<0)
                    keys.epg_selection=0;
                if(keys.epg_selection>=this.epg_doms.length)
                    keys.epg_selection=this.epg_doms.length-1;
                this.hoverEpgItem(keys.epg_selection);
                break;
            case "video_control":
                this.hideFullScreenInfo();
                break;
            case "full_screen":
                this.showNextChannel(-1*increment);
                break;
        }
    },
    handleMenuLeftRight:function(increment) {
        var keys=this.keys;
        switch (keys.focused_part) {
            case "category_selection":
                if(increment>0 && this.movies.length>0){
                    keys.focused_part="channel_selection";
                    $(this.prev_focus_dom).removeClass('rearrange');
                    this.hoverChannel(keys.channel_selection);
                }
                break;
            case "channel_selection":
                if(increment<0)
                    this.hoverChannelFooterItem(0);
                else
                    this.hoverChannelFooterItem(2);
                break;
            case "channel_footer_selection":
                keys.channel_footer_selection+=increment;
                if(keys.channel_footer_selection<0)
                    keys.channel_footer_selection=0;
                if(keys.channel_footer_selection>=this.channel_footer_doms.length)
                    keys.channel_footer_selection=this.channel_footer_doms.length-1;
                this.hoverChannelFooterItem(keys.channel_footer_selection);
                break;
            case "video_control":
                keys.video_control+=increment;
                if(keys.video_control<0)
                    keys.video_control=0;
                if(keys.video_control>=this.video_control_doms.length)
                    keys.video_control=this.video_control_doms.length-1;
                this.hoverVideoControl(keys.video_control);
                break;
            case "full_screen":
                this.showFullScreenInfo();
                break;
        }
    },
    HandleKey:function(e) {
        if(this.is_loading)
            return;
        var keys=this.keys;
        switch (e.keyCode) {
            case tvKey.RIGHT:
                this.handleMenuLeftRight(1)
                break;
            case tvKey.LEFT:
                this.handleMenuLeftRight(-1)
                break;
            case tvKey.DOWN:
                this.handleMenusUpDown(1);
                break;
            case tvKey.UP:
                this.handleMenusUpDown(-1);
                break;
            case tvKey.ENTER:
                this.handleMenuClick();
                break;
            case tvKey.CH_UP:
                this.handleChKey(1);
                break;
            case tvKey.CH_DOWN:
                this.handleChKey(-1);
                break;
            case tvKey.RETURN:
                this.goBack();
                break;
            case tvKey.RED:
                this.addOrRemoveFav();
                break;
            case tvKey.GREEN:
                this.handleGreenKeyEvent()
                break;
            case tvKey.N1:
                this.goChannelNum(1);
                break;
            case tvKey.N2:
                this.goChannelNum(2);
                break;
            case tvKey.N3:
                this.goChannelNum(3);
                break;
            case tvKey.N4:
                this.goChannelNum(4);
                break;
            case tvKey.N5:
                this.goChannelNum(5);
                break;
            case tvKey.N6:
                this.goChannelNum(6);
                break;
            case tvKey.N7:
                this.goChannelNum(7);
                break;
            case tvKey.N8:
                this.goChannelNum(8);
                break;
            case tvKey.N9:
                this.goChannelNum(9);
                break;
            case tvKey.N0:
                this.goChannelNum(0);
                break;
            case tvKey.PAUSE:
                this.playOrPause();
                break;
            case tvKey.PLAY:
                this.playOrPause();
                break;
            case tvKey.PLAYPAUSE:
                this.playOrPause();
                break;
            case tvKey.BLUE:
                this.handleBlueKeyEvent();
                break;
        }
    },
    
    // EPG Caching Methods
    getCachedEpg: function(channel_id) {
        return this.epg_cache.get(channel_id);
    },
    
    setCachedEpg: function(channel_id, programmes) {
        var cache_entry = {
            programmes: programmes,
            cached_at: Date.now(),
            last_program_end: null
        };
        
        // Find the current program end time for smart refresh
        if(programmes.length > 0) {
            var current_time = moment().unix();
            for(var i = 0; i < programmes.length; i++) {
                var start_time = getLocalChannelTime(programmes[i].start).unix();
                var end_time = getLocalChannelTime(programmes[i].stop).unix();
                if(start_time <= current_time && current_time <= end_time) {
                    cache_entry.last_program_end = end_time;
                    break;
                }
            }
        }
        
        this.epg_cache.set(channel_id, cache_entry);
        this.last_program_check.set(channel_id, cache_entry.last_program_end);
    },
    
    shouldRefreshEpg: function(channel_id, cached_data) {
        if(!cached_data) return true;
        
        var current_time = Date.now();
        var cache_age = current_time - cached_data.cached_at;
        
        // Force refresh if cache is older than 30 minutes
        if(cache_age > this.cache_duration) {
            return true;
        }
        
        // Smart refresh: check if current program has ended
        if(cached_data.last_program_end) {
            var current_unix_time = moment().unix();
            if(current_unix_time > cached_data.last_program_end) {
                return true;
            }
        }
        
        return false;
    },
    
    // Helper method to get current program from cached EPG data
    getCurrentProgramFromCache: function(programmes) {
        if(!programmes || programmes.length === 0) return null;
        
        var current_time = moment().unix();
        for(var i = 0; i < programmes.length; i++) {
            var start_time = getLocalChannelTime(programmes[i].start).unix();
            var end_time = getLocalChannelTime(programmes[i].stop).unix();
            if(start_time <= current_time && current_time <= end_time) {
                return programmes[i];
            }
        }
        return null;
    },
    
    
    
    
    
    
    
    
    
    
    
    
    
    // Timer Management
    clearAllTimers: function() {
        // Clear specific timers
        clearInterval(this.progressbar_timer);
        clearTimeout(this.full_screen_timer);
        clearTimeout(this.next_channel_timer);
        clearTimeout(this.current_channel_epg_timer);
        clearTimeout(this.hover_channel_epg_timer);
        clearTimeout(this.category_hover_timer);
        clearTimeout(this.channel_number_timer);
        clearInterval(this.next_programme_timer);
        clearTimeout(this.batch_fetch_timer);
        
        // Clear all tracked timers
        for(var i = 0; i < this.active_timers.length; i++) {
            clearTimeout(this.active_timers[i].timer_id);
        }
        this.active_timers = [];
        
        
        // Reset timer references
        this.progressbar_timer = null;
        this.full_screen_timer = null;
        this.next_channel_timer = null;
        this.current_channel_epg_timer = null;
        this.hover_channel_epg_timer = null;
        this.category_hover_timer = null;
        this.channel_number_timer = null;
        this.next_programme_timer = null;
        this.batch_fetch_timer = null;
        
    },
    
    // Timer tracking helper
    addTimer: function(timer_id, type, channel_id) {
        this.active_timers.push({
            timer_id: timer_id,
            type: type,
            channel_id: channel_id || null,
            created_at: Date.now()
        });
    },
    
    removeTimer: function(timer_id) {
        this.active_timers = this.active_timers.filter(function(timer) {
            return timer.timer_id !== timer_id;
        });
    },
    
    
    
    
    
};
