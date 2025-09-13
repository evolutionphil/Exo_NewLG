"use strict";
var vod_summary_page={
    keys:{
        index:0
    },
    min_btn_index:0,
    action_btns:$('.vod-action-btn'),
    is_favourite:false,
    is_loading:false,
    prev_route:'',
    init:function(prev_route){
        this.prev_route=prev_route;
        var that=this;
        $('#vod-summary-image-wrapper img').attr('src','');
        $('.vod-series-background-img').attr('src','').hide();
        $('#vod-summary-image-wrapper img').attr('src',current_movie.stream_icon ? current_movie.stream_icon : 'images/404.png');
        this.is_favourite=!VodModel.favourite_ids.includes(current_movie.stream_id);
        this.toggleFavourite();
        $('#vod-summary-name').text(current_movie.name);
        $('#vod-watch-trailer-button').hide();
        $('#vod-summary-release-date').text("");
        $('#vod-summary-release-genre').text("");
        $('#vod-summary-release-length').text("");
        $('#vod-summary-release-age').text("");
        $('#vod-summary-release-director').text("");
        $('#vod-summary-release-cast').text("");
        $('#vod-summary-description').text("");
        $('.vod-series-total-summary .release-date').addClass('hide');
        $('.vod-series-total-summary .duration').addClass('hide');
        var current_category;
        if(this.prev_route==='vod-series-page')
            current_category=vod_series_page.categories[vod_series_page.current_category_index];
        else if(this.prev_route==='search-page'){
            var categories=VodModel.categories;
            for(var i=0;i<categories.length;i++){
                if(categories[i].category_id===current_movie.category_id){
                    current_category=categories[i];
                    break;
                }
            }
        }
        $('.vod-series-total-summary .current-category').text(current_category.category_name);
        current_movie.youtube_trailer="";
        this.hoverButton(1);
        var rating=0;
        if(typeof current_movie.rating==="undefined" || current_movie.rating==="")
            rating=0;
        else
            rating=parseFloat(current_movie.rating);
        if(isNaN(rating))
            rating=0;
        $('#vod-rating-container').find('.rating-upper').css({width:rating*10+"%"});
        $('#vod-rating-mark').text(rating.toFixed(1));
        if(VodModel.favourite_ids.includes(current_movie.stream_id)){
            $(this.action_btns[2]).data('action','remove')
            $(this.action_btns[2]).addClass('favourite');
            // $(this.action_btns[2]).text(typeof current_words['remove_favorites']!='undefined' ? current_words['remove_favorites'] : 'Remove Fav')
        }
        else{
            $(this.action_btns[2]).data('action','add')
            $(this.action_btns[2]).removeClass('favourite');
            // $(this.action_btns[2]).text(typeof current_words['add_to_favorite']!='undefined' ? current_words['add_to_favorite'] : 'Add Fav')
        }
        $('#vod-series-page').addClass('hide');
        $('#vod-summary-page').removeClass('hide');
        current_route="vod-summary-page";
        this.min_btn_index=1;
        current_movie.info={};

        if(settings.playlist_type==='xtreme'){
            showLoader(true);
            this.is_loading=true;
            $.getJSON(api_host_url+"/player_api.php?username="+user_name+"&password="+password+"&action=get_vod_info&vod_id="+current_movie.stream_id)
                .done(function(response){
                    console.log('=== XTREME API get_vod_info RESPONSE ANALYSIS ===');
                    console.log('Full API response:', response);
                    console.log('Response keys:', Object.keys(response));
                    console.log('Info object:', response.info);
                    if(response.info) {
                        console.log('Info object keys:', Object.keys(response.info));
                        console.log('TMDB ID check:', response.info.tmdb_id);
                        console.log('TMDB ID type:', typeof response.info.tmdb_id);
                    }
                    
                    var info=response.info;
                    $('#vod-summary-release-date').text(info.releasedate);
                    $('#vod-summary-release-genre').text(info.genre);
                    $('#vod-summary-release-length').text(info.duration);
                    $('#vod-summary-release-age').text(info.age);
                    $('#vod-summary-release-director').text(info.director);
                    $('#vod-summary-release-cast').text(info.cast);
                    $('#vod-summary-description').text(info.description);
                    if(info.releasedate){
                        $('.vod-series-total-summary .release-date').text(info.releasedate);
                        $('.vod-series-total-summary .release-date').removeClass('hide')
                    }
                    if(info.duration && info.duration!='00:00' && info.duration!='00:00:00'){
                        $('.vod-series-total-summary .duration').text(info.duration);
                        $('.vod-series-total-summary .duration').removeClass('hide')
                    }
                    current_movie.info=info;
                    
                    // CRITICAL: Extract TMDB ID from API response
                    if(info.tmdb_id) {
                        current_movie.tmdb_id = info.tmdb_id;
                        console.log('✅ TMDB ID extracted and stored:', current_movie.tmdb_id);
                    } else {
                        console.log('⚠️ NO TMDB ID in API response - subtitle matching will be less accurate');
                    }
                    var backdrop_image=current_movie.stream_icon ? current_movie.stream_icon : 'images/404.png';
                    try{
                        if(info.backdrop_path[0])
                            backdrop_image=info.backdrop_path[0];
                    }catch (e) {
                    }
                    $('.vod-series-background-img').attr('src',backdrop_image).show();
                    current_movie.youtube_trailer=response.info.youtube_trailer;
                    if(typeof info.youtube_trailer!='undefined' && info.youtube_trailer!=null && info.youtube_trailer.trim()!==''){
                        that.min_btn_index=0;
                        $('#vod-watch-trailer-button').show();
                    }
                    showLoader(false);
                    that.is_loading=false;
                })
                .fail(function () {
                    showLoader(false);
                    that.is_loading=false;
                })
        }
    },
    goBack:function(){
        $('#vod-summary-page').addClass('hide');
        current_route=this.prev_route;
        if(this.prev_route==='vod-series-page'){
            $("#vod-series-page").removeClass('hide');
            var keys=vod_series_page.keys;
            var menu_doms=vod_series_page.menu_doms;
            if(this.is_favourite){
                if($(menu_doms[keys.menu_selection]).find('.favourite-badge').length==0){
                    VodModel.addRecentOrFavouriteMovie(current_movie, 'favourite');
                    $($(menu_doms[keys.menu_selection]).find('.vod-series-menu-item')).prepend('<div class="favourite-badge"><i class="fa fa-heart"></i></div>');
                }
            }
            else{
                VodModel.removeRecentOrFavouriteMovie(current_movie.stream_id,"favourite");
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
        }else if(this.prev_route==='search-page'){
            $('#search-page').show();
        }
    },
    showTrailerVideo:function(){
        if(current_movie.youtube_trailer==="" || current_movie.youtube_trailer==undefined){
            $('#toast-body').html("<h3>Sorry<br>No trailer video available</h3>")
            $('.toast').toast({animation: true, delay: 2000});
            $('#toast').toast('show')
        }else{
            trailer_page.init(current_movie.youtube_trailer,current_route);
        }
    },
    showMovie:function(){
        $('#vod-summary-page').addClass('hide');
        vod_series_player_page.makeEpisodeDoms('vod-summary-page');
        vod_series_player_page.init(current_movie,"movies",this.prev_route,'',true);
    },
    toggleFavourite:function(){
        var targetElement=this.action_btns[2];
        this.is_favourite=!this.is_favourite;
        if(this.is_favourite)
            $(targetElement).addClass('favourite');
            // $(targetElement).text(typeof current_words['remove_favorites']!='undefined' ? current_words['remove_favorites'] : 'Remove Fav');
        else{
            $(targetElement).removeClass('favourite');
            // $(targetElement).text(typeof current_words['add_to_favorite']!='undefined' ? current_words['add_to_favorite'] : 'Add Fav');
        }
    },
    hoverButton:function(index){
        var keys=this.keys;
        keys.index=index;
        $('.vod-action-btn').removeClass('active');
        $($('.vod-action-btn')[keys.index]).addClass('active');
    },
    keyMove:function(increment){
        var min_index=this.min_btn_index;
        var keys=this.keys;
        keys.index+=increment;
        if(keys.index<min_index)
            keys.index=2;
        if(keys.index>2)
            keys.index=min_index;
       this.hoverButton(keys.index);
    },
    keyClick:function(){
        var keys=this.keys;
        var buttons=$('.vod-action-btn');
        var current_button=buttons[keys.index];
        $(current_button).trigger('click');
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
                this.keyMove(-1);
                break;
            case tvKey.RIGHT:
                this.keyMove(1);
                break;
            case tvKey.UP:
                break;
            case tvKey.DOWN:
                break;
            case tvKey.ENTER:
                this.keyClick();
                break;
            case tvKey.YELLOW:
                this.toggleFavourite();
                break;
        }
    }
}