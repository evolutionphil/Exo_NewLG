"use strict";
var vod_series_page={
    player:null,
    channel_number_timer:null,
    channel_num:0,
    movies:[],
    initiated:false,
    categories:[],
    category_hover_timer:null,
    category_hover_timeout:300,
    keys:{
        focused_part:"category_selection",//"right_screen_part", search_selection
        category_selection:0,
        menu_selection:0,
        search_selection:-1,
        video_control:0,
        top_menu_selection:0,
        sort_selection:0
    },
    category_doms:[],
    menu_doms:[],
    top_menu_doms:[],
    current_movie_type:'movie',
    sort_key:'vod_sort',
    search_key_timer:'',
    search_key_timout:400,
    current_render_count:0,
    render_count_increment:40,
    is_drawing:false,
    prev_keyword:'',
    prev_dom:null,
    sort_doms:$('.sort-modal-item'),
    init:function (movie_type) {
        this.prev_dom=null;
        this.is_drawing=false;
        var keys=this.keys;
        if(movie_type==='vod'){
            $('.vod-series-top-btn.series').addClass('hide');
            $('.vod-series-top-btn.vod').removeClass('hide');
        }
        else{
            $('.vod-series-top-btn.vod').addClass('hide');
            $('.vod-series-top-btn.series').removeClass('hide');
        }
        this.top_menu_doms=$('.vod-series-top-btn:not(.hide)')
        $('.vod-series-mark-wrapper').addClass('hide');
        $('.'+movie_type+'-mark-wrapper').removeClass('hide');
        $('#channel-category-page').addClass('hide');
        $("#vod-series-page").removeClass('hide');
        current_route="vod-series-page";
        this.current_movie_type=movie_type;
        if(movie_type==='vod'){
            this.sort_key='vod_sort'
            this.categories=VodModel.getCategories(false, true);
        }
        else{
            this.sort_key='series_sort';
            this.categories=SeriesModel.getCategories(false, true);
        }

        var htmlContent='';
        this.categories.map(function (item,index) {
            htmlContent+=
                '<div class="vod-series-category-item bg-focus" data-index="'+index+'"' +
                '   onmouseenter="vod_series_page.hoverCategory(this)" ' +
                '   onclick="vod_series_page.handleMenuClick()"'+
                '> '+
                    item.category_name+
                '</div>'
        })
        $('#vod-series-categories-container').html(htmlContent);
        this.category_doms=$('.vod-series-category-item');
        keys.focused_part='category_selection';

        keys.category_selection=0;
        this.current_render_count=0;
        $('#vod-series-menus-container').html('')
        this.current_category_index=-1;
        this.showCategoryContent();
        this.hoverCategory(this.category_doms[keys.category_selection]);
    },
    goBack:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                keys.focused_part="category_selection";
                this.hoverCategory(this.category_doms[keys.category_selection]);
                break;
            case "category_selection":
                $('#vod-series-page').addClass('hide');
                $('#channel-category-page').removeClass('hide');
                current_route='channel-category-page';
                break;
            case "top_menu_selection":
                $('#vod-series-search-input').blur();
                this.hoverCategory(this.category_doms[keys.category_selection]);
                break;
            case "sort_selection":
                $('#sort-modal-container').hide();
                this.hoverTopMenu(0);
                break;
        }
    },
    showCategoryContent:function(){
        var keys=this.keys;
        if(this.current_category_index===keys.category_selection)
            return;
        var category=this.categories[keys.category_selection];
        this.current_render_count = 0;
        $('#vod-series-menus-container').html('');
        this.prev_keyword='';
        $('#vod-series-search-input').val('');
        var movies=[];
        var sort_key=settings[this.current_movie_type+'_sort'];
        if(category.category_id==='all'){
            var current_model=this.current_movie_type==='vod' ? VodModel : SeriesModel;
            var categories=current_model.getCategories(false,false);
            categories.map(function (item){
                if(!checkForAdult(item,'category',[]))
                    movies=movies.concat(item.movies);
            })
            // sort_key='added';
        }else{
            movies=category.movies.filter(function (item) {
                return true;
            })
        }
        this.movies = getSortedMovies(movies, sort_key);
        this.renderCategoryContent();
        $('#vod-series-menus-container').scrollTop(0);
        keys.menu_selection = 0;
        this.current_category_index = keys.category_selection;
        $('#vod-series-current-category').text(category.category_name);
        this.sort_doms.map(function (index, item) {
            var sort_key1=$(item).data('sort_key');
            if(sort_key===sort_key1)
                keys.sort_selection=index;
        })
        $('#sort-btn-title').text($(this.sort_doms[keys.sort_selection]).text());
    },
    renderCategoryContent:function(){
        var  htmlContents='';
        var default_icon="images/404.png";
        var movie_key='stream_icon';
        if(this.current_movie_type!=='vod')
            movie_key="cover";
        if(this.current_render_count<this.movies.length){
            this.is_drawing=true;
            showLoader(true)
            var that=this;
            setTimeout(function () {
                that.is_drawing=false;
                showLoader(false);
            },1000)
            var favourite_ids,movie_id_key;
            var saved_video_times=[], resume_allowed=false;
            if(this.current_movie_type==='vod' || this.current_movie_type==='movie'){
                movie_id_key=VodModel.movie_key;
                favourite_ids=VodModel.favourite_ids;
                saved_video_times=VodModel.saved_video_times;
                resume_allowed=true;
            }
            else{
                movie_id_key=SeriesModel.movie_key;
                favourite_ids=SeriesModel.favourite_ids;
            }

            this.movies.slice(this.current_render_count,this.current_render_count+this.render_count_increment).map(function(movie, index){
                var img=movie[movie_key] ? movie[movie_key] : 'images/404.png'
                var is_favourite=favourite_ids.includes(movie[movie_id_key]);
                var is_resume=false;
                if(resume_allowed && saved_video_times[movie.stream_id])
                    is_resume=true;
                htmlContents+=
                    '<div class="vod-series-menu-item-container" data-stream_id="'+movie.stream_id+'"\
                        data-index="'+(that.current_render_count+index)+'"\
                        onmouseenter="vod_series_page.hoverMovieItem(this)"\
                        onclick="vod_series_page.handleMenuClick()"\
                    >\
                        <div class="vod-series-menu-item">'+
                            (is_favourite ? '<div class="favourite-badge"><i class="fa fa-heart"></i></div>' : '')+
                    '       <img class="vod-series-icon" src="'+img+'" onerror="this.src=\''+default_icon+'\'">\
                            <div class="vod-series-menu-item-title-wrapper sub-bg-focus">\
                                <div class="vod-series-menu-item-title max-line-2">'+movie.name+'</div>\
                            </div>\
                            <i class="vod-series-watch-icon fa fa-eye'+(is_resume ? ' resume' : '')+'"></i>\
                        </div>\
                    </div>'
            })
            this.current_render_count+=this.render_count_increment;
            $('#vod-series-menus-container').append(htmlContents);
            this.menu_doms=$('#vod-series-menus-container .vod-series-menu-item-container');
        }
    },
    rerenderResumeVideos:function (){
        var keys=this.keys;
        var category=this.categories[keys.category_selection];
        if(category.category_id==='recent' && this.current_movie_type==='vod'){
            var origin_movie_selection=this.keys.menu_selection;
            this.current_category_index=-1;
            this.showCategoryContent();
            if(origin_movie_selection>=this.menu_doms.length)
                origin_movie_selection=this.menu_doms.length-1;
            if(this.movies.length==0){
                this.hoverCategory(this.category_doms[keys.category_selection]);
                return;
            }
            this.hoverMovieItem(this.menu_doms[origin_movie_selection]);
        }
    },
    addOrRemoveFav:function(){
        var keys=this.keys;
        if(keys.focused_part!=='menu_selection')
            return;
        var menu_doms=this.menu_doms;
        var movies=this.movies;
        var favourite_ids,movie_id_key;
        if(this.current_movie_type==='vod' || this.current_movie_type==='movie'){
            movie_id_key=VodModel.movie_key;
            favourite_ids=VodModel.favourite_ids;
        }
        else{
            movie_id_key=SeriesModel.movie_key;
            favourite_ids=SeriesModel.favourite_ids;
        }
        if(!favourite_ids.includes(movies[keys.menu_selection][movie_id_key])){
            $($(menu_doms[keys.menu_selection]).find('.vod-series-menu-item')).prepend('<div class="favourite-badge"><i class="fa fa-star"></i></div>');
            if(this.current_movie_type==='vod' || this.current_movie_type==='movie')
                VodModel.addRecentOrFavouriteMovie(movies[keys.menu_selection],'favourite');
            else
                SeriesModel.addRecentOrFavouriteMovie(movies[keys.menu_selection],'favourite');
        }else{
            $($(menu_doms[keys.menu_selection]).find('.favourite-badge')).remove();
            if(this.current_movie_type==='vod' || this.current_movie_type==='movie')
                VodModel.removeRecentOrFavouriteMovie(movies[keys.menu_selection][movie_id_key],'favourite');
            else
                SeriesModel.removeRecentOrFavouriteMovie(movies[keys.menu_selection][movie_id_key],'favourite');
            var category=this.categories[this.current_category_index];
            if(category.category_id==='favourite'){
                $(menu_doms[keys.menu_selection]).remove();
                var menu_doms=$('#vod-series-menus-container .vod-series-menu-item-container');
                if(menu_doms.length>0){
                    menu_doms.map(function (index, item) {
                        $(item).data('index',index);
                    })
                    this.menu_doms=menu_doms;
                    if(keys.menu_selection>=this.menu_doms.length)
                        keys.menu_selection=this.menu_doms.length-1;
                    this.hoverMovieItem(this.menu_doms[keys.menu_selection]);
                }else
                    this.hoverCategory(this.category_doms[keys.category_selection]);
            }
        }
    },
    searchMovie:function(){
        $('#vod-series-search-input').focus();
        setTimeout(function () {
            var tmp = $('#vod-series-search-input').val();
            $('#vod-series-search-input')[0].setSelectionRange(tmp.length, tmp.length);
        },200)
    },
    searchValueChange:function(){
        clearTimeout(this.search_key_timer);
        var that=this;
        this.search_key_timer=setTimeout(function () {
            var search_value=$('#vod-series-search-input').val();
            if(that.prev_keyword===search_value)
                return;
            var category=that.categories[that.current_category_index];
            var current_movies=JSON.parse(JSON.stringify(category.movies));
            current_movies.sort(function (a, b) {
                return a.name.localeCompare(b.name);
            })
            var filtered_movies=[];
            if(search_value===""){
                filtered_movies=current_movies;
            }
            else {
                search_value=search_value.toLowerCase();
                filtered_movies = current_movies.filter(function (movie) {
                    return movie.name.toLowerCase().includes(search_value);
                })
            }
            that.movies=filtered_movies;
            $('#vod-series-menus-container').html('')
            that.current_render_count=0;
            that.renderCategoryContent();
            that.prev_keyword=search_value;
        },this.search_key_timout)
    },
    showSortModal:function(){
        // var sort_key=settings[this.current_movie_type+'_sort'];
        // var sort_key_index=0;
        // this.sort_doms.map(function (index, item) {
        //     var sort_key1=$(item).data('sort_key')
        //     if(sort_key1==sort_key)
        //         sort_key_index=index
        // })
        $('#sort-modal-container').show();
        this.hoverSortItem(this.keys.sort_selection);
    },
    closeSortModal:function(){
        $('#sort-modal-container').hide();
        var keys=this.keys;
        if(keys.focused_part==='sort_selection')
            this.hoverTopMenu(1);
    },
    changeMovieType:function (movie_type){
        if(this.current_movie_type===movie_type){
            this.hoverCategory(this.category_doms[this.keys.category_selection]);
            return;
        }
        $(this.top_menu_doms).removeClass('active');
        this.prev_dom=null;
        this.init(movie_type);
    },
    goToSettingsPage:function (){
        $('#vod-series-page').addClass('hide');
        setting_page.init('vod-series-page');
    },
    goToSearchPage:function (){
        $('#vod-series-page').addClass('hide');
        search_page.init('vod-series-page');
    },
    hoverSortItem:function(index){
        var keys=this.keys;
        keys.focused_part='sort_selection';
        keys.sort_selection=index;
        $(this.prev_dom).removeClass('active')
        $(this.sort_doms[index]).addClass('active');
        this.prev_dom=this.sort_doms[index];
    },
    hoverCategory:function(targetElement){
        var keys=this.keys;
        var index=$(targetElement).data('index');
        keys.focused_part="category_selection";
        keys.category_selection=index;
        $(this.prev_dom).removeClass('active');
        $(this.category_doms[index]).addClass('active');
        this.prev_dom=this.category_doms[index];
        moveScrollPosition($('#vod-series-categories-container'),this.category_doms[index],'vertical',false);
    },
    hoverMovieItem:function(targetElement){
        var index=$(targetElement).data('index');
        var keys=this.keys;
        keys.focused_part="menu_selection";
        keys.menu_selection=index;
        $(this.prev_dom).removeClass('active');
        $(this.menu_doms[index]).addClass('active');
        this.prev_dom=this.menu_doms[index];
        clearTimeout(this.channel_hover_timer);
        moveScrollPosition($('#vod-series-menus-container'),this.menu_doms[keys.menu_selection],'vertical',false);
    },
    hoverTopMenu:function(index){
        var keys=this.keys;
        keys.top_menu_selection=index;
        keys.focused_part='top_menu_selection';
        $(this.prev_dom).removeClass('active');
        $(this.top_menu_doms[index]).addClass('active');
        this.prev_dom=this.top_menu_doms[index];
    },
    handleMenuClick:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                if(this.current_movie_type==='vod'){
                    current_movie=this.movies[keys.menu_selection];
                    vod_summary_page.init('vod-series-page');
                }else{
                    current_series=this.movies[keys.menu_selection];
                    series_summary_page.init('vod-series-page');
                }
                break;
            case "top_menu_selection":
                $(this.top_menu_doms[keys.top_menu_selection]).trigger('click');
                break;
            case "category_selection":
                var category=this.categories[keys.category_selection];
                if(this.current_category_index==keys.category_selection)
                    return;
                var is_adult=checkForAdult(category,'category',[]);
                if(is_adult){
                    parent_confirm_page.init(current_route);
                    return;
                }
                this.showCategoryContent();
                break;
            case "sort_selection":
                var category=this.categories[keys.category_selection];
                // if(category.category_id!=='all'){
                    this.current_category_index=-1;
                    var sort_key=$(this.sort_doms[keys.sort_selection]).data('sort_key');
                    settings.saveSettings(this.current_movie_type+'_sort',sort_key,'');
                    $('#sort-btn-title').data('word_code',sort_key);
                    $('#sort-btn-title').text(current_words[sort_key] ? current_words[sort_key] : settings.sort_keys[sort_key]);
                    this.showCategoryContent();
                // }
                this.goBack();
                break;
        }
    },
    handleMenusUpDown:function(increment) {
        var keys=this.keys;
        var menus=this.menu_doms;
        $('#vod-series-search-input').blur();
        switch (keys.focused_part) {
            case "category_selection":
                keys.category_selection+=increment;
                if(keys.category_selection<0){
                    keys.category_selection=0;
                    return;
                }
                if(keys.category_selection>=this.category_doms.length){
                    keys.category_selection=this.category_doms.length-1;
                    return;
                }
                this.hoverCategory(this.category_doms[keys.category_selection]);
                break;
            case "menu_selection":
                var prev_menu_selection=keys.menu_selection;
                keys.menu_selection+=6*increment;
                if(keys.menu_selection>=menus.length)
                    keys.menu_selection=menus.length-1;
                if(keys.menu_selection<0){
                    keys.menu_selection=prev_menu_selection;
                    this.hoverTopMenu(0);
                    // this.searchMovie();
                    return;
                }
                if(keys.menu_selection>=this.current_render_count-5)
                    this.renderCategoryContent();
                this.hoverMovieItem(this.menu_doms[keys.menu_selection]);
                break;
            case "top_menu_selection":
                if(increment>0){
                    $('#vod-series-search-input').blur();
                    if(this.menu_doms.length==0)
                        return;
                    if(keys.menu_selection>=this.menu_doms.length)
                        keys.menu_selection=this.menu_doms.length-1;
                    if(keys.menu_selection>4)
                        keys.menu_selection=0;
                    this.hoverMovieItem(this.menu_doms[keys.menu_selection]);
                }
                break;
            case "sort_selection":
                keys.sort_selection+=increment;
                if(keys.sort_selection<0)
                    keys.sort_selection=0;
                if(keys.sort_selection>=this.sort_doms.length)
                    keys.sort_selection=this.sort_doms.length-1;
                this.hoverSortItem(keys.sort_selection);
        }
    },
    handleMenuLeftRight:function(increment) {
        var keys=this.keys;
        $('#vod-series-search-input').blur();
        switch (keys.focused_part) {
            case "category_selection":
                if(increment>0){
                    if(this.movies.length>0)
                        this.hoverMovieItem(this.menu_doms[keys.menu_selection]);
                    else{
                        var search_value=$('#vod-series-search-input').val();
                        if(search_value){
                            this.hoverTopMenu(0);
                            // this.searchMovie();
                        }
                    }
                }
                break;
            case "menu_selection":
                if(keys.menu_selection % 6==0 && increment<0){
                    this.hoverCategory(this.category_doms[keys.category_selection]);
                    return;
                }
                keys.menu_selection+=increment;
                if(keys.menu_selection<0){
                    keys.menu_selection=0;
                    this.hoverCategory(this.category_doms[keys.category_selection]);
                    return;
                }
                if(keys.menu_selection>=this.menu_doms.length)
                    keys.menu_selection=this.menu_doms.length-1;
                this.hoverMovieItem(this.menu_doms[keys.menu_selection]);
                if(increment>0 && keys.menu_selection>=this.current_render_count-5)
                    this.renderCategoryContent();
                break;
            case "top_menu_selection":
                keys.top_menu_selection+=increment;
                if(keys.top_menu_selection<0){
                    this.hoverCategory(this.category_doms[keys.category_selection]);
                    return;
                }
                if(keys.top_menu_selection>=this.top_menu_doms.length)
                    keys.top_menu_selection=this.top_menu_doms.length-1;
                this.hoverTopMenu(keys.top_menu_selection);
                break;
        }
    },
    HandleKey:function(e) {
        if(!this.is_drawing){
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
                    this.showNextChannel(1);
                    break;
                case tvKey.CH_DOWN:
                    this.showNextChannel(-1);
                    break;
                case tvKey.RETURN:
                    this.goBack();
                    break;
                case tvKey.YELLOW:
                    this.addOrRemoveFav();
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
                case tvKey.GREEN:
                    $(this.top_menu_doms[1]).trigger('click');
                    break;
                case tvKey.BLUE:
                    $(this.top_menu_doms[0]).trigger('click');
                    break;
                case tvKey.RED:
                    this.goToSettingsPage();
                    break;
                default:
                    console.log("No matching")
            }
        }
    }
}