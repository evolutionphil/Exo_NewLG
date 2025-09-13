"use strict";
var series_summary_page={
    keys:{
        focused_part:'season_selection',
        season_selection:0,
        episode_selection:0,
        action_btn:0
    },
    min_btn_index:0,
    season_doms:[],
    episode_doms:[],
    current_season_index:0,
    hover_season_timer:null,
    is_loading:false,
    action_btns:$('.series-action-btn'),
    is_favourite:false,
    prev_route:'',
    init:function(prev_route){
        this.prev_route=prev_route;
        this.current_season_index=-1;
        showLoader(true);
        this.is_loading=true;
        this.is_favourite=!SeriesModel.favourite_ids.includes(current_series.series_id);
        this.toggleFavourite();
        var that=this;
        $('#current-season-name').text('Select Season');
        current_route="series-summary-page";
        $('#episode-items-container').html('');
        $('.vod-series-background-img').attr('src','').hide();
        $('#series-summary-image-wrapper img').attr('src','');
        $('#series-summary-image-wrapper img').attr('src',current_series.cover ? current_series.cover : 'images/404.png')
        $('#series-summary-name').text(current_series.name);
        $('#series-summary-release-date').text(current_series.releasedate);
        $('#series-summary-release-genre').text(current_series.genre);
        $('#series-summary-release-length').text(current_series.duration);
        $('#series-summary-release-director').text(current_series.director);
        $('#series-summary-release-cast').text(current_series.cast);
        $('#series-summary-description').text(current_series.plot);

        var current_category;
        if(prev_route==='vod-series-page')
            current_category=vod_series_page.categories[vod_series_page.current_category_index];
        else if(prev_route==='search-page'){
            var categories=SeriesModel.categories;
            for(var i=0;i<categories.length;i++){
                if(categories[i].category_id===current_series.category_id){
                    current_category=categories[i];
                    break;
                }
            }
        }
        $('.vod-series-total-summary .current-category').text(current_category.category_name);
        $('.vod-series-total-summary .release-date').addClass('hide');
        $('.vod-series-total-summary .duration').addClass('hide');
        if(current_series.releaseDate){
            $('.vod-series-total-summary .release-date').text(current_series.releaseDate);
            $('.vod-series-total-summary .release-date').removeClass('hide')
        }
        $(this.action_btns).removeClass('active');
        this.min_btn_index=1;
        this.keys.action_btn=1;
        $(this.action_btns[0]).hide();
        var rating=0;
        if(typeof current_series.rating==="undefined" || current_series.rating==="")
            rating=0;
        else
            rating=parseFloat(current_series.rating);
        if(isNaN(rating))
            rating=0;
        $('#series-rating-container').find('.rating-upper').css({width:rating*10+"%"});
        $('#series-rating-mark').text(rating.toFixed(1));

        $('#vod-series-page').addClass('hide');
        $('#series-summary-page').removeClass('hide');
        this.keys.focused_part='episode_selection';

        var categories=SeriesModel.getCategories(true,false);
        if(!checkForAdult(current_series,'movie',categories))
            SeriesModel.addRecentOrFavouriteMovie(current_series,'recent');
        if(settings.playlist_type==='xtreme'){
            $.getJSON(api_host_url+'/player_api.php?username='+user_name+'&password='+password+'&action=get_series_info&series_id='+current_series.series_id)
                .done(function(response){
                    console.log('=== XTREME API get_series_info RESPONSE ANALYSIS ===');
                    console.log('Full API response:', response);
                    console.log('Response keys:', Object.keys(response));
                    console.log('Info object:', response.info);
                    if(response.info) {
                        console.log('Info object keys:', Object.keys(response.info));
                        console.log('TMDB ID check:', response.info.tmdb_id);
                        console.log('TMDB ID type:', typeof response.info.tmdb_id);
                    }
                    
                    current_series.info=response.info;
                    
                    // CRITICAL: Extract TMDB ID from API response for series
                    if(response.info && response.info.tmdb_id) {
                        current_series.tmdb_id = response.info.tmdb_id;
                        console.log('✅ SERIES TMDB ID extracted and stored:', current_series.tmdb_id);
                    } else {
                        console.log('⚠️ NO SERIES TMDB ID in API response - subtitle matching will be less accurate');
                    }
                    var seasons=response.seasons;
                    if(response.episodes && (seasons && seasons.length>0 || Object.keys(response.episodes).length>0)){
                        var episodes=response.episodes;
                        if(!seasons || seasons.length==0){
                            seasons=[];
                            Object.keys(episodes).map(function(key, index){
                                seasons.push({
                                    name:"Season "+(index+1),
                                    cover:"images/404.png",
                                    episodes:episodes[key]
                                })
                            })
                        }
                        else{
                            seasons.map(function(item){
                                item.episodes=episodes[item.season_number.toString()]
                            })
                        }
                        var seasons1=seasons.filter(function (item) {
                            return item.episodes && item.episodes.length>0;
                        });
                        var episode_keys=Object.keys(episodes);
                        if(episode_keys.length>seasons1.length){
                            for(var i=0;i<seasons1.length;i++)
                                seasons1[i].name='Season '+(i+1);
                            for(var i=seasons1.length;i<episode_keys.length;i++){
                                seasons1.push({
                                    name:'Season '+(i+1),
                                    episodes: episodes[(i+1).toString()]
                                })
                            }
                        }
                        current_series.seasons=seasons1;
                        that.showSeriesInfo();
                    }else{
                        showLoader(false);
                        that.is_loading=false;
                        showToast("Sorry","No seasons available");
                        that.goBack();
                    }
                })
                .fail(function () {
                    showLoader(false);
                    that.is_loading=false;
                    showToast("Sorry","No seasons available");
                    that.goBack();
                })
        }
        else if(settings.playlist_type==='type1'){
            current_series.seasons.map(function(item){
                item.episodes=current_series.episodes[item.name]
            })
            this.showSeriesInfo();
        }
    },
    showSeriesInfo:function(){
        var htmlContent="";
        current_series.seasons.map(function(season, index1){
            htmlContent+=
                '<div class="season-item-container bg-focus"\
                    onmouseenter="series_summary_page.hoverSeason('+index1+')"\
                    onclick="series_summary_page.handleMenuClick()" \
                >' +
                season.name+
                '</div>'
        })
        $('#season-items-container').html(htmlContent);
        this.season_doms=$('.season-item-container');
        this.keys.season_selection=0;
        try{
            $('#selected-season-name').text(current_series.seasons[0].name);
            var backdrop_image=current_series.cover ? current_series.cover : 'images/404.png';
            try{
                if(current_series.info.backdrop_path[0])
                    backdrop_image=current_series.info.backdrop_path[0];
            }catch (e) {
                console.log(e);
            }
            if(backdrop_image)
                $('.vod-series-background-img').attr('src',backdrop_image).show();
            this.showEpisodes();
            this.hoverEpisode(0)
        }catch (e) {
            console.log(e);
        }
        try{
            if(current_series.info.youtube_trailer){
                this.min_btn_index=0;
                $(this.action_btns[0]).show();
            }
        }catch (e) {
        }
        showLoader(false);
        this.is_loading=false;
    },
    showEpisodes:function(){
        var keys=this.keys;
        if(this.current_season_index===keys.season_selection)
            return;
        current_season=current_series.seasons[keys.season_selection];
        $('.current-season-name').text(current_season.name);
        $('.current-season-episodes').text(current_season.episodes.length+' Episodes');
        $('#current-season-name').text(current_season.name)
        var episodes=current_season.episodes;
        if(typeof episodes!="undefined" && episodes.length>0){
            var htmlContent="";
            episodes.map(function(episode, index){
                var title=episode.title ? episode.title : 'Episode '+(index+1)
                var episode_img=current_season.cover;
                if(episode.info && episode.info.movie_image)
                    episode_img=episode.info.movie_image;
                htmlContent+=
                    '<div class="episode-item-container">\
                        <div class="episode-item-wrapper"\
                            onmouseenter="series_summary_page.hoverEpisode('+index+')"\
                            onclick="series_summary_page.handleMenuClick()"\
                        >\
                            <div class="episode-item-title">'+title+'</div> \
                            <div class="episode-item-img-wrapper">\
                                <img src="'+episode_img+'" onerror="this.src=\'images/404.png\'" class="sub-border-focus">\
                            </div>\
                        </div>\
                    </div>'
            })
            $('#episode-items-container').html(htmlContent);
            $('#episode-items-container').scrollTop(0);
        }
        else{
            showToast("Sorry","No episodes available");
            $('#episode-items-container').html('');
        }
        keys.episode_selection=0;
        this.episode_doms=$('.episode-item-wrapper');
        $('#selected-season-name').text(current_season.name);
        this.current_season_index=keys.season_selection;
    },
    goBack:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "season_selection":
                $('#season-item-modal').hide();
                keys.focused_part='select_season_btn';
                break;
            case "select_season_btn":
            case "episode_selection":
            case "action_btn":
                current_route=this.prev_route;
                $('#series-summary-page').addClass('hide');
                if(this.prev_route==='vod-series-page'){
                    $('#vod-series-page').removeClass('hide');
                    var keys=vod_series_page.keys;
                    var menu_doms=vod_series_page.menu_doms;
                    if(this.is_favourite){
                        if($(menu_doms[keys.menu_selection]).find('.favourite-badge').length==0){
                            SeriesModel.addRecentOrFavouriteMovie(current_series, 'favourite');
                            $($(menu_doms[keys.menu_selection]).find('.vod-series-menu-item')).prepend('<div class="favourite-badge"><i class="fa fa-heart"></i></div>');
                        }
                    }
                    else{
                        SeriesModel.removeRecentOrFavouriteMovie(current_series.series_id,"favourite");
                        var category=vod_series_page.categories[keys.category_selection];
                        var menu_doms=vod_series_page.menu_doms;
                        if(category.category_id==='favourite'){
                            $(menu_doms[keys.menu_selection]).remove();
                            if(menu_doms.length>0){
                                menu_doms.map(function (index, item) {
                                    $(item).data('index',index);
                                })
                                menu_doms=$('#vod-series-menus-container .vod-series-menu-item-container');
                                vod_series_page.menu_doms=menu_doms;
                                if(keys.menu_selection>=vod_series_page.menu_doms.length)
                                    keys.menu_selection=vod_series_page.menu_doms.length-1;
                                $(vod_series_page.menu_doms[keys.menu_selection]).addClass('active');
                            }else{
                                keys.focused_part='category_selection';
                                $(vod_series_page.category_doms[keys.category_selection]).addClass('active');
                            }
                        }else{
                            $($(menu_doms[keys.menu_selection]).find('.favourite-badge')).remove();
                        }
                    }
                }else{
                    $('#search-page').show();
                }
                break;
        }
    },
    toggleFavourite:function(){
        var targetElement=this.action_btns[1];
        this.is_favourite=!this.is_favourite;
        if(this.is_favourite)
            $(targetElement).addClass('favourite');
        else{
            $(targetElement).removeClass('favourite');
        }
    },
    showTrailerVideo:function(){
        if(!current_series.info || !current_series.info.youtube_trailer){
            $('#toast-body').html("<h3>Sorry<br>No trailer video available</h3>")
            $('.toast').toast({animation: true, delay: 2000});
            $('#toast').toast('show')
        }else{
            trailer_page.init(current_series.info.youtube_trailer,current_route);
        }
    },
    showSeasonsModal:function (){
        $('#season-item-modal').show();
        this.hoverSeason(this.current_season_index);
    },
    hoverSeason:function(index){
        var keys=this.keys;
        keys.focused_part="season_selection";
        keys.season_selection=index;
        $(this.season_doms).removeClass('active');
        $(this.season_doms[index]).addClass('active');
        clearTimeout(this.hover_season_timer);
        moveScrollPosition($('#season-items-container'),this.season_doms[keys.season_selection],'vertical',false);
    },
    hoverEpisode:function(index){
        var keys=this.keys;
        keys.episode_selection=index;
        keys.focused_part="episode_selection";
        $('#select-season-btn').removeClass('active');
        $(this.episode_doms).removeClass('active');
        $(this.episode_doms[keys.episode_selection]).addClass('active');
        $(this.action_btns).removeClass('active');
        moveScrollPosition($('#episode-items-container'),this.episode_doms[keys.episode_selection],'horizontal',false);
    },
    hoverButton:function(index){
        var keys=this.keys;
        keys.focused_part="action_btn";
        keys.action_btn=index;
        $('#select-season-btn').removeClass('active');
        $(this.episode_doms).removeClass('active');
        $(this.action_btns).removeClass('active');
        $(this.action_btns[index]).addClass('active');
    },
    handleMenuLeftRight:function(increment){
        var keys=this.keys;
        switch (keys.focused_part) {
            case 'select_season_btn':
                if(increment<0)
                    this.hoverButton(this.min_btn_index);
                break;
            case 'episode_selection':
                keys.episode_selection+=increment;
                if(keys.episode_selection<0)
                    keys.episode_selection=0;
                if(keys.episode_selection>=this.episode_doms.length){
                    keys.episode_selection=this.episode_doms.length-1;
                    return;
                }
                this.hoverEpisode(keys.episode_selection);
                break;
            case "action_btn":
                keys.action_btn+=increment;
                if(keys.action_btn>2)
                    keys.action_btn=2;
                if(keys.action_btn<this.min_btn_index)
                    keys.action_btn=this.min_btn_index;
                this.hoverButton(keys.action_btn);
                break;
        }
    },
    handleMenuUpDown:function(increment){
        var keys=this.keys;
        switch (keys.focused_part) {
            case 'season_selection':
                keys.season_selection+=increment;
                if(keys.season_selection<0){
                    keys.season_selection=0;
                    return;
                }
                if(keys.season_selection>=this.season_doms.length){
                    keys.season_selection=this.season_doms.length-1;
                    return;
                }
                this.hoverSeason(keys.season_selection);
                break;
            case 'episode_selection':
                if(increment<0)
                    this.hoverButton(keys.action_btn);
                break;
            case "action_btn":
                if(increment>0)
                    this.hoverEpisode(keys.episode_selection);
                break;
        }
    },
    handleMenuClick:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "episode_selection":
                current_season=current_series.seasons[keys.season_selection];
                var episodes=current_season.episodes;
                current_episode=episodes[keys.episode_selection];
                $('#series-summary-page').addClass('hide');
                vod_series_player_page.makeEpisodeDoms('episode-page');
                vod_series_player_page.init(current_episode,'series',"episode-page",'',true)
                vod_series_player_page.keys.episode_selection=keys.episode_selection;
                break;
            case 'action_btn':
                $(this.action_btns[keys.action_btn]).trigger('click');
                break;
            case 'season_selection':
                $('#season-item-modal').hide();
                this.showEpisodes();
                this.hoverEpisode(keys.episode_selection);
                break;
        }
    },
    HandleKey:function (e) {
        if(this.is_loading){
            if(e.keyCode===tvKey.RETURN){
                showLoader(false);
                this.is_loading=false;
                this.goBack();
            }
            return;
        }
        switch (e.keyCode) {
            case tvKey.RETURN:
                this.goBack();
                break;
            case tvKey.LEFT:
                this.handleMenuLeftRight(-1);
                break;
            case tvKey.RIGHT:
                this.handleMenuLeftRight(1);
                break;
            case tvKey.UP:
                this.handleMenuUpDown(-1);
                break;
            case tvKey.DOWN:
                this.handleMenuUpDown(1);
                break;
            case tvKey.ENTER:
                this.handleMenuClick();
                break;
        }
    }
}