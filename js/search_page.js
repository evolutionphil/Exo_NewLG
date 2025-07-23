"use strict";
var search_page={
    keys:{
        top_menu_selection:0,
        hor_keys:[0,0,0],
        v_selection:0,
        movie_selection:[],
        focused_part:''
    },
    prev_dom:null,
    is_loading:false,
    filtered_movies:[],
    render_counts:[0,0,0],
    prev_keyword:'',
    search_timeout:null,
    prev_route:'',
    top_menu_doms:$('.search-page-top-menu'),
    movie_doms:[],
    render_count_increment:50,
    parent_elements:[$('#filtered_channels_container')[0], $('#filtered_movies_container')[0], $('#filtered_series_container')[0]],
    init:function(prev_route){
        this.prev_route=prev_route;
        $('#filtered_movies_container').html('');
        $('#filtered_channels_container').html('');
        $('#filtered_series_container').html('');
        this.filtered_movies=[];
        this.keys.hor_keys=[0,0,0];
        this.prev_keyword='';
        $('#search-page-input').val('')
        $('#search-page').show();
        current_route='search-page';
        this.hoverTopMenu(1);
        this.handleMenuClick();
    },
    goBack:function(){
        clearTimeout(this.search_timeout);
        $('#search-page-input').blur();
        $('#search-page').hide();
        current_route=this.prev_route;
        switch (this.prev_route) {
            case "home-page":
                home_page.reEnter();
                break;
            case "vod-series-page":
                $('#vod-series-page').removeClass('hide');
                break;
            case "channel-category-page":
                $('#channel-category-page').removeClass('hide');
                break;
        }
    },
    keywordChange:function(){
        clearTimeout(this.search_timeout);
        var that=this;
        this.search_timeout=setTimeout(function () {
            var prev_keyword=that.prev_keyword;
            var keyword=$('#search-page-input').val().toLowerCase();
            if(prev_keyword==keyword || !keyword)
                return;
            showLoader(true);
            that.is_loading=true;
            var vod_categories=VodModel.getCategories(false,false);
            var series_categories=SeriesModel.getCategories(false,false);
            var live_categories=LiveModel.getCategories(false,false);

            that.filtered_movies=[];
            that.filtered_movies.push(that.getFilteredMovies(live_categories,keyword));
            that.filtered_movies.push(that.getFilteredMovies(vod_categories,keyword));
            that.filtered_movies.push(that.getFilteredMovies(series_categories,keyword));

            that.render_counts=[0,0,0];
            that.keys.hor_keys=[0,0,0];
            that.movie_doms=[[],[],[]];
            $(that.parent_elements[0]).html('');
            $(that.parent_elements[1]).html('');
            $(that.parent_elements[2]).html('');
            that.renderFilteredMovies(0,false);
            that.renderFilteredMovies(1,false);
            that.renderFilteredMovies(2,false);
            that.prev_keyword=keyword;

            var time_out=2000;
            var total_length=that.filtered_movies[0].length+that.filtered_movies[1].length+that.filtered_movies[2].length;
            if(total_length<50)
                time_out=500;
            setTimeout(function () {
                showLoader(false);
                that.is_loading=false;
            },time_out)
        },400)
    },
    getFilteredMovies:function(categories, keyword){
        var result=[];
        categories.map(function (item) {
            if(!checkForAdult(item,'category',[]) && item.category_id!=='resume'){
                var movies=item.movies.filter(function (movie) {
                    return movie.name.toLowerCase().includes(keyword)
                })
                result=result.concat(movies);
            }
        })
        return result;
    },
    renderFilteredMovies:function(index, hide_loader){
        var parent_element=this.parent_elements[index];
        var render_count=this.render_counts[index];
        if(render_count>=this.filtered_movies[index].length)
            return;
        var render_count_increment=this.render_count_increment;
        if(hide_loader){
            showLoader(true);
            this.is_loading=true;
        }
        var that=this;
        var html='';
        var channel_class=index==0 ? ' channel' : '';
        var img_key='stream_icon';
        var saved_video_times=[], resume_allowed=false;
        if(index==1){  // if it is vod
            saved_video_times=VodModel.saved_video_times;
            resume_allowed=true;
        }
        if(index==2)
            img_key='cover';
        var default_image='images/404.png';

        var movies=this.filtered_movies[index].slice(render_count, render_count+render_count_increment);
        var time_out=1500;
        if(movies.length<10)
            time_out=0;
        movies.map(function (item, index1) {
            var is_resume=false;
            if(resume_allowed && saved_video_times[item.stream_id])
                is_resume=true;
            html+=
                '<div class="filtered-movie-container'+channel_class+'">\
                    <div class="filtered-movie-wrapper bg-focus"\
                        onmouseenter="search_page.hoverMovie('+(render_count+index1)+','+index+')"\
                        onclick="search_page.handleMenuClick()" \
                    >\
                        <div class="filtered-movie-img-wrapper">\
                            <img src="'+item[img_key]+'" onerror="this.src=\''+default_image+'\'">\
                        </div>\
                        <div class="filtered-movie-title-wrapper">\
                            <div class="filtered-movie-title">'+item.name+'</div> \
                        </div> \
                        <i class="vod-series-watch-icon fa fa-eye'+(is_resume ? ' resume' : '')+'"></i>\
                    </div>\
                </div>'
        })
        this.render_counts[index]+=render_count_increment;
        $(parent_element).append(html);
        this.movie_doms[index]=$(parent_element).find('.filtered-movie-wrapper');
        if(hide_loader){
            setTimeout(function () {
                showLoader(false);
                that.is_loading=false;
            },time_out);
        }
    },
    hoverTopMenu:function(index){
        if(keyboard_displayed)
            return;
        var keys=this.keys;
        keys.focused_part='top_menu_selection';
        keys.top_menu_selection=index;
        $(this.prev_dom).removeClass('active');
        $(this.top_menu_doms[index]).addClass('active');
        this.prev_dom=this.top_menu_doms[index];
    },
    hoverMovie:function(hor_index, ver_index){
        if(keyboard_displayed)
            return;
        var keys=this.keys;
        keys.hor_keys[ver_index]=hor_index;
        keys.v_selection=ver_index;
        keys.focused_part='movie_selection';
        var parent_element=this.parent_elements[ver_index];
        $(this.prev_dom).removeClass('active');
        $(this.movie_doms[ver_index][hor_index]).addClass('active');
        this.prev_dom=this.movie_doms[ver_index][hor_index];
        moveScrollPosition(parent_element,this.prev_dom,'horizontal',false);
        moveScrollPosition($('#search-page-contents-wrapper'),$(parent_element).closest('.search-page-stream-type-container'),'vertical',false);
    },
    handleMenuLeftRight:function(increment){
        var keys=this.keys;
        if(keyboard_displayed)
            return;
        switch (keys.focused_part) {
            case "top_menu_selection":
                if(increment<0)
                    keys.top_menu_selection=0;
                else
                    keys.top_menu_selection=1;
                this.hoverTopMenu(keys.top_menu_selection);
                break;
            case "movie_selection":
                var new_selection=keys.hor_keys[keys.v_selection]+increment;
                if(new_selection<0)
                    new_selection=0;
                if(new_selection>=this.movie_doms[keys.v_selection].length)
                    new_selection=this.movie_doms[keys.v_selection].length-1;
                this.hoverMovie(new_selection,keys.v_selection);
                if(increment>0 && new_selection>=this.movie_doms[keys.v_selection].length-5)
                    this.renderFilteredMovies(keys.v_selection, true);
                break;
        }
    },
    handleMenuUpDown:function(increment){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "top_menu_selection":
                if(increment>0){
                    keys.v_selection=0;
                    this.hoverMovie(keys.hor_keys[0],0);
                }
                break;
            case "movie_selection":
                keys.v_selection+=increment;
                if(keys.v_selection<0){
                    this.hoverTopMenu(1);
                    return
                }
                if(keys.v_selection>=3)
                    keys.v_selection=2;
                this.hoverMovie(keys.hor_keys[keys.v_selection],keys.v_selection);
                break;
        }
    },
    handleMenuClick:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "top_menu_selection":
                if(keys.top_menu_selection==0)
                    this.goBack();
                else{
                    $('#search-page-input').focus()
                    setSelectionRange($('#search-page-input'));
                }
                break;
            case 'movie_selection':
                var movie=this.filtered_movies[keys.v_selection][keys.hor_keys[keys.v_selection]];
                $('#search-page').hide();
                switch (keys.v_selection) {
                    case 0:
                        var categories=LiveModel.categories;
                        for(var i=0;i<categories.length;i++){
                            if(categories[i].category_id==movie.category_id){
                                channel_page.init(movie,false, 'search-page');
                                break;
                            }
                        }
                        break;
                    case 1:
                        current_movie=this.filtered_movies[1][keys.hor_keys[1]];
                        vod_summary_page.init('search-page');
                        break;
                    case 2:
                        current_series=this.filtered_movies[2][keys.hor_keys[2]];
                        series_summary_page.init('search-page');
                        break;
                }
                break;
        }
    },
    HandleKey:function (e) {
        if(this.is_loading)
            return;
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