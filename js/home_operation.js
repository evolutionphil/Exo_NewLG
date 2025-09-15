"use strict";
var home_page={
    initiated:false,
    keys:{
        focused_part:"menu_selection", // or, "search part", "slider part", "sub menu part", "search_value"
        menu_selection:0, // the index of selected menu,
    },
    prev_focus_dom:null,
    menu_doms:$('#home-page .menu-item-container'),
    notification_timer:null,
    init:function(){
        this.prev_focus_dom=null;
        turn_off_page.prev_route='home-page';
        if(current_route!=='turn-off-page')
            current_route='home-page';
        $('#loading-page').addClass('hide');
        $('#app').show();

        var html='';
        languages.map(function (item,index) {
            if(!item.words[item.code])
                console.log(item.name)
            html+=
                '<div class="modal-operation-menu-type-3 language-item bg-focus"\
                   data-sort_key="default"\
                   onmouseenter="setting_page.hoverLanguage('+index+')"\
                   onclick="setting_page.selectLanguage(\''+item.code+'\','+index+')"\
                   data-language="'+item.code+'"\
                >' +
                    item.words[item.code]+
                '</div>'
        })
        $('#select-language-body').html(html);

        setting_page.language_doms=$('.language-item');
        setting_page.doms_translated = $("*").filter(function() {
            return $(this).data("word_code") !== undefined;
        });
        setting_page.changeDomsLanguage();
        channel_category_page.init();
        
        // Start async loading of VOD and Series data in background
        this.loadVodAndSeriesAsync();
    },
    
    loadVodAndSeriesAsync:function(){
        // Only load if we have an Xtream playlist
        if(settings.playlist_type !== 'xtreme') {
            return;
        }
        
        var prefix_url = api_host_url + '/player_api.php?username=' + user_name + '&password=' + password + '&action=';
        
        // Load VOD categories and streams asynchronously
        $.when(
            $.ajax({
                method: 'get',
                url: prefix_url + 'get_vod_categories',
                timeout: 30000,
                success: function(data) {
                    VodModel.setCategories(data);
                },
                error: function(error) {
                    // Handle error silently
                }
            }),
            $.ajax({
                method: 'get',
                url: prefix_url + 'get_vod_streams',
                timeout: 60000,
                success: function(data) {
                    VodModel.setMovies(data);
                },
                error: function(error) {
                    // Handle error silently
                }
            })
        ).then(function() {
            try {
                VodModel.insertMoviesToCategories();
            } catch(e) {
                // Handle error silently
            }
        });
        
        // Load Series categories and data asynchronously
        $.when(
                $.ajax({
                    method: 'get',
                    url: prefix_url + 'get_series_categories',
                    timeout: 30000,
                    success: function(data) {
                        SeriesModel.setCategories(data);
                    },
                    error: function(error) {
                        // Handle error silently
                    }
                }),
                $.ajax({
                    method: 'get',
                    url: prefix_url + 'get_series',
                    timeout: 60000,
                    success: function(data) {
                        SeriesModel.setMovies(data);
                    },
                    error: function(error) {
                        // Handle error silently
                    }
                })
            ).then(function() {
                try {
                    SeriesModel.insertMoviesToCategories();
                } catch(e) {
                    // Handle error silently
                }
            });
    },
    
    exit:function(){
        $('#home-page').addClass('hide');
    },
    reEnter:function(){
        $('#home-page').removeClass('hide');
        current_route="home-page";
    },
    clickMainMenu:function(index){
        switch (index) {
            case 0:  // live tv
                channel_page.init();
                break;
            case 1:
                vod_series_page.init('vod');
                break;
            case 2:
                vod_series_page.init('series');
                break;
            case 3:
                playlist_page.init();
                break;
            case 4:
                home_page.exit();
                setting_page.init();
                break;
            case 5:
                current_route='login';
                $('#app').hide();
                $(this.menu_doms[4]).removeClass('active');
                setTimeout(function () {
                    login_page.fetchPlaylistInformation();
                },100)
                break;
            case 6:
                this.goBack();
                break;
        }
    },
    goBack:function () {
        var keys=this.keys;
        if(keys.focused_part==="menu_selection"){
           turn_off_page.init(current_route);
        }
    },
    hoverMainMenu:function(index, to_center){
        var keys=this.keys;
        keys.focused_part="menu_selection";
        keys.menu_selection=index;
        $(this.prev_focus_dom).removeClass('active');
        this.prev_focus_dom=this.menu_doms[index];
        $(this.menu_doms[index]).addClass('active');
        moveScrollPosition($('#menu-wrapper'),this.menu_doms[index],'horizontal',to_center)
    },
    handleMenuClick:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                $(this.menu_doms[keys.menu_selection]).trigger('click');
                break;
        }
    },
    handleMenusUpDown:function(increment) {
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                break;
        }
    },
    handleMenuLeftRight:function(increment) {
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                keys.menu_selection+=increment;
                if(keys.menu_selection<0)
                    keys.menu_selection=0;
                if(keys.menu_selection>=this.menu_doms.length)
                    keys.menu_selection=this.menu_doms.length-1;
                this.hoverMainMenu(keys.menu_selection, true);
                break;
        }
    },
    HandleKey:function(e){
        if(!this.is_drawing){
            switch (e.keyCode) {
                case tvKey.RIGHT:
                    this.handleMenuLeftRight(1);
                    break;
                case tvKey.LEFT:
                    this.handleMenuLeftRight(-1);
                    break;
                case tvKey.DOWN:
                    this.handleMenusUpDown(1)
                    break;
                case tvKey.UP:
                    this.handleMenusUpDown(-1)
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
}