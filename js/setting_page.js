"use strict";
var setting_page={
    player:null,
    keys:{
        focused_part:'menu_selection',
        hor_keys:[0, 0, 0, 0],
        v_selection:0,
        video_kind_selection:0,
        playlist_selection:0,
        hide_category_modal:0,
        hide_category_btn_selection:0,
        time_format_modal:0,
        time_format_btn_selection:0,
        lock_playlist_selection:0,
        lock_playlist_btn_selection:0,
        clear_cache_selection:0
    },
    hor_key_counts:[4, 4, 5, 6],
    menu_doms:[],
    initiated:false,
    parent_control_doms:$('.parent-control-item'),
    hide_category_doms:[],
    theme_modal_options:[],
    hide_category_movie_type:'',
    doms_translated:[],
    language_doms:[],
    prev_route:'',
    prev_focus_dom:null,
    video_kind_doms:$('.select-video-kind-item'),
    playlist_initiated:false,
    playlist_items:[],
    focus_color_index:0,
    epg_color_index:0,
    bg_focus_color_index:0,
    color_synced:false,
    hide_category_btn_doms:$('.hide-category-modal-btn'),
    live_category_changed:false,
    vod_category_changed:false,
    series_category_changed:false,
    time_format_doms:$('.time-format-modal-item'),
    time_format_btn_doms:$('.time-format-modal-btn'),
    lock_playlist_doms:$('.lock-modal-item'),
    lock_playlists_btns:$('.lock-playlist-modal-btn'),
    clear_cache_btns:$('#clear-cache-modal .setting-modal-btn'),
    init:function(prev_route){
        this.live_category_changed=false;
        this.vod_category_changed=false;
        this.series_category_changed=false;
        this.prev_route=prev_route;
        current_route="setting-page";
        this.menu_doms=[];
        var that=this;
        this.hor_keys=[0,0,0,0];
        $('.setting-items-container').map(function (index, item){
            that.menu_doms.push($(item).find('.setting-menu-item'))
        })
        $('.buffer-size').text(settings.buffer_size);
        $(this.menu_doms[1][2]).text(settings.playlist.name);
        this.hoverSettingMenu(0,0);
        $('.epg-color').css({'border-color':settings.epg_txt_color});
        $('.focus-color').css({'border-color':settings.focus_color});
        $('.bg-focus-color').css({'border-color':settings.bg_focus_color});
        if(!this.color_synced){
            this.epg_color_index=0;
            this.focus_color_index=0;
            this.bg_focus_color_index=0;
            for(var i=0;i<epg_colors.length;i++){
                if(epg_colors[i].color==settings.epg_txt_color){
                    this.epg_color_index=i;
                    break;
                }
            }
            for(var i=0;i<focus_colors.length;i++){
                if(focus_colors[i].color==settings.focus_color){
                    this.focus_color_index=i;
                    break;
                }
            }
            for(var i=0;i<bg_focus_colors.length;i++){
                if(bg_focus_colors[i].color==settings.bg_focus_color){
                    this.bg_focus_color_index=i;
                    break;
                }
            }
        }
        var lock_state_btn_title='Locked';
        if(settings.lock_state==='off')
            lock_state_btn_title='Unlocked'
        $(this.menu_doms[2][4]).text(lock_state_btn_title);
        $('#setting-page').removeClass('hide');
    },
    goBack:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                $('#setting-page').addClass('hide');
                current_route=this.prev_route;
                if(this.prev_route==='channel-category-page'){
                    $('#channel-category-page').removeClass('hide');
                    if(this.live_category_changed)
                        channel_category_page.init();
                }
                else if(this.prev_route==='vod-series-page'){
                    $('#vod-series-page').removeClass('hide');
                    if(vod_series_page.current_movie_type=='vod' && this.vod_category_changed)
                        vod_series_page.init('vod');
                    if(vod_series_page.current_movie_type=='series' && this.series_category_changed)
                        vod_series_page.init('series');
                }
                break;
            case "parent_control_modal":
                this.cancelResetParentAccount();
                break;
            case "user_account_modal":
                $('#user-account-modal').modal('hide');
                keys.focused_part="menu_selection";
                break;
            case "hide_category_modal":
                $('#hide-category-modal').modal('hide');
                keys.focused_part="menu_selection";
                break;
            case "theme_modal":
                $('#theme-modal').modal('hide');
                keys.focused_part="menu_selection";
                break;
            case "language_selection":
                $('#language-select-modal').modal('hide');
                keys.focused_part="menu_selection";
                break;
            default:
                $('.modal').modal('hide');
                this.hoverSettingMenu(keys.v_selection,keys.hor_keys[keys.v_selection]);
        }
    },
    showParentControlModal:function(){
        $('#parent-account-valid-error').hide();
        $('#settings-modal').modal('hide');
        $('.parent-modal-input-wrapper input').val('');
        $('#parent-control-modal').modal('show');
        this.keys.focused_part="parent_control_modal";
        $(this.parent_control_doms).removeClass('active');
        this.keys.parent_control_modal=0;
        $(this.parent_control_doms[0]).addClass('active');
        $(this.parent_control_doms[0]).focus();
    },
    clickParentControl:function(){
        var keys=this.keys;
        switch (keys.parent_control_modal) {
            case 0:
            case 1:
            case 2:
                $(this.parent_control_doms[keys.parent_control_modal]).focus();
                var that=this;
                setTimeout(function () {
                    var tmp = $(that.parent_control_doms[keys.parent_control_modal]).val();
                    $(that.parent_control_doms[keys.parent_control_modal]).setSelectionRange(tmp.length, tmp.length);               },200)
                break;
            case 3:
                this.resetParentAccount();
                break;
            case 4:
                this.cancelResetParentAccount();
                break;
        }

    },
    resetParentAccount:function(){
        $('#parent-account-valid-error').hide();
        var origin_parent_password=$('#current_parent_password').val();
        var new_password=$('#new_parent_password').val();
        var new_password_confirm=$('#new_parent_password_confirm').val();
        if(origin_parent_password!=parent_account_password){
            $('#parent-account-valid-error').text("Current password does not match").slideDown();
            return;
        }
        if(new_password!=new_password_confirm){
            $('#parent-account-valid-error').text("Password does not match").slideDown();
            return;
        }
        parent_account_password=new_password;
        localStorage.setItem(storage_id+'parent_account_password', parent_account_password);
        $('#parent-control-modal').modal('hide');
        this.keys.focused_part="menu_selection";
    },
    cancelResetParentAccount:function(){
        $('#parent-control-modal').modal('hide');
        this.keys.focused_part="menu_selection";
    },
    getSelectedLanguageWords:function(code){
        var words={};
        for(var i=0;i<languages.length;i++){
            if(languages[i].code===code){
                words=languages[i].words;
                break;
            }
        }
        current_words=words;
    },
    showHideCategoryModal:function(movie_type){
        $('#select-video-kind-modal').modal('hide');
        this.hide_category_movie_type=movie_type;
        $('#settings-modal').modal('hide');
        var categories;
        if(movie_type==='live')
            categories=LiveModel.getCategories(true,false);
        if(movie_type==="movie" || movie_type==='vod')
            categories=VodModel.getCategories(true,false);
        if (movie_type==="series")
            categories=SeriesModel.getCategories(true,false);
        var htmlContent='';
        categories.map(function(category, index){
            htmlContent+=
                '<div class="hide-category-modal-option setting-modal-option hide-category-modal-item bg-focus"' +
                '   onclick="setting_page.clickHideCategory('+index+')"'+
                '   onmouseenter="setting_page.hoverHideCategory('+index+')"'+
                '>'+
                '   <input class="setting-modal-checkbox" type="checkbox" name="checkbox"'+
                '       id="hide-category-item-'+category.category_id+'" '+(category.is_hide ? 'checked' : '')+' value="'+category.category_id+'">'+
                '   <label for="hide-category-item-dfafdd'+category.category_id+'">'+category.category_name+'</label>'+
                '</div>'
            ;
        });
        $('#hide-modal-categories-container').html(htmlContent);
        $('#hide-category-modal').modal('show');
        var hide_category_doms=$('.hide-category-modal-item');
        this.hide_category_doms=hide_category_doms;
        this.hoverHideCategory(0);
        this.keys.hide_category_btn_selection=0;
        $('#hide-modal-categories-container').scrollTop(0);
    },
    clickHideCategory:function(index){
        var current_item=this.hide_category_doms[index];
        var current_value=$($(current_item).find('input')[0]).prop('checked');
        current_value=!current_value;
        $($(current_item).find('input')[0]).prop('checked',current_value);
    },
    showUserAccounts:function(){
        $('#settings-modal').modal('hide');
        $('#user-account-mac-address').text(mac_address);
        if(is_trial==0)
            $('#user-account-is_trial').text('Trial');
        else
            $('#user-account-is_trial').text('Active');

        $('#user-account-modal').modal('show');
        this.keys.focused_part="user_account_modal";
    },
    showLanguages:function(){
        $('#settings-modal').modal('hide');
        var keys=this.keys;
        keys.focused_part="language_selection";
        keys.language_selection=0;
        var language_doms=this.language_doms;
        language_doms.map(function (index,item) {
            var language=$(item).data('language');
            if(language==settings.language){
                keys.language_selection=index;
            }
        })
        $(language_doms).removeClass('active');
        $(language_doms[keys.language_selection]).addClass('active');
        $('#language-select-modal').modal('show');
        moveScrollPosition($('#select-language-body'),language_doms[keys.language_selection],'vertical',false);
    },
    selectLanguage:function(code, index){
        settings.saveSettings('language',code,'');
        var keys=this.keys;
        keys.language_selection=index;
        $(this.language_doms).removeClass('active');
        $(this.language_doms[index]).addClass('active');
        $('#language-select-modal').modal('hide');
        keys.focused_part="menu_selection";
        this.changeDomsLanguage();
    },
    changeDomsLanguage:function(){
        this.getSelectedLanguageWords(settings.language);
        var doms_translated=this.doms_translated;
        doms_translated.map(function (index, item) {
            var word_code=$(item).data('word_code');
            if(typeof current_words[word_code]!='undefined'){
                $(item).text(current_words[word_code]);
            }
        })
        $('.current-language').text(current_words[settings.language]);
    },
    confirmParentPassword:function(){
        $('#parent-confirm-password-error').hide();
        var typed_parent_password=$('#parent-confirm-password').val();
        if(parent_account_password===typed_parent_password){
            $('#parent-confirm-modal').modal('hide');
            this.keys.focused_part=this.keys.prev_focus;
            this.showCategoryContent();
        }
        else{
            $('#parent-confirm-password-error').text("Password does not match").show();
            return;
        }
    },
    cancelParentPassword:function(){
        $('#parent-confirm-modal').modal('hide');
        this.keys.focused_part=this.keys.prev_focus;
    },
    increaseBufferSize:function (increment){
        var buffer_size=settings.buffer_size;
        var min_buffer_size=settings.min_buffer_size;
        var max_buffer_size=settings.max_buffer_size;
        buffer_size+=increment;
        if(buffer_size<min_buffer_size)
            buffer_size=min_buffer_size;
        if(buffer_size>max_buffer_size)
            buffer_size=max_buffer_size;
        settings.saveSettings('buffer_size',buffer_size,'')
        $('.buffer-size').text(buffer_size);
    },
    increaseColorIndex:function (kind, increment){
        var color;
        if(kind==='focus'){
            var focus_color_index=this.focus_color_index;
            focus_color_index+=increment;
            if(focus_color_index<0)
                return;
            if(focus_color_index>=focus_colors.length)
                return
            this.focus_color_index=focus_color_index
            color=focus_colors[focus_color_index].color;
            $('.focus-color').css({'border-color':color});
            settings.saveSettings('focus_color',color,'');
            assignColorCode(color,'focus');
        }
        else if(kind==='epg'){
            var epg_color_index=this.epg_color_index;
            epg_color_index+=increment;
            if(epg_color_index<0)
                return;
            if(epg_color_index>=epg_colors.length)
                return
            this.epg_color_index=epg_color_index
            color=epg_colors[epg_color_index].color;
            $('.epg-color').css({'border-color':color});
            settings.saveSettings('epg_txt_color',color,'');
            assignColorCode(color, 'epg');
        }
        else if(kind==='bg-focus-color'){
            var bg_focus_color_index=this.bg_focus_color_index;
            bg_focus_color_index+=increment;
            if(bg_focus_color_index<0)
                return;
            if(bg_focus_color_index>=bg_focus_colors.length)
                return
            this.bg_focus_color_index=bg_focus_color_index
            color=bg_focus_colors[bg_focus_color_index].color;
            $('.bg-focus-color').css({'border-color':color});
            settings.saveSettings('bg_focus_color',color,'');
            assignColorCode(color, 'bg_focus_color');
        }
    },
    showVideoKindSelectionModal:function (){
        $('#select-video-kind-modal').modal('show');
        this.hoverVideoKindItem(0);
    },
    showPlayListModal:function (){
        if(!this.playlist_initiated){
            var html='';
            playlist_urls.map(function (item, index){
                html+=
                '<div class="playlist-item-container bg-focus"\
                    onmouseenter="setting_page.hoverPlayListItem('+index+')" \
                    onclick="setting_page.handleMenuClick()" \
                >'+item.name+'\
                </div>\
                '
            });
            $('#playlist-items-container').html(html);
            this.playlist_items=$('.playlist-item-container');
        }
        this.initiated=true;
        $('#playlist-select-modal').modal('show');
        this.hoverPlayListItem(0);
    },
    confirmHideCategory:function (){
        var elements=$('#hide-category-modal').find('input[type=checkbox]:checked');
        var hidden_category_ids=[];
        $(elements).map(function (index, item){
            hidden_category_ids.push($(item).val())
        });
        if(this.hide_category_movie_type==='live'){
            LiveModel.saveHiddenCategories(hidden_category_ids);
            this.live_category_changed=true;
        }
        else if(this.hide_category_movie_type==='movie' || this.hide_category_movie_type==='vod'){
            VodModel.saveHiddenCategories(hidden_category_ids);
            this.vod_category_changed=true;
        }
        else{
            SeriesModel.saveHiddenCategories(hidden_category_ids);
            this.series_category_changed=true;
        }
        this.goBack();
    },
    selectAllCategory:function (){
        var not_checked_elements=$('#hide-category-modal').find('input:checkbox:not(:checked)');
        if(not_checked_elements.length>0)
            $('#hide-category-modal').find('input').prop('checked',true);
        else
            $('#hide-category-modal').find('input').prop('checked',false);
    },
    showTimeFormatModal:function (){
        $('input[name="timeformat"]').prop('checked', false);
        $('input[name="timeformat"][value="'+settings.time_format+'"]').prop('checked',true)
        $('#time-format-modal').modal('show');
        this.hoverTimeFormat(0);
    },
    saveTimeFormat:function (){
        var time_format=$('input[name="timeformat"]:checked').val();
        settings.saveSettings('time_format',time_format,'');
        updateTimer();
        this.goBack();
    },
    clickTimeFormat:function (){
        var keys=this.keys;
        var current_item=this.time_format_doms[keys.time_format_modal];
        $(this.time_format_doms).map(function (index, item){
            $(item).find('input').prop('checked',false);
        })
        $($(current_item).find('input')[0]).prop('checked',true);
    },
    showPrivacyModal:function (){
        $('#privacy-modal').modal('show');
        this.keys.focused_part='privacy_modal';
        $('.privacy-modal-content').scrollTop(0);
    },
    movePrivacyScrollbar:function (increment){
        $('.privacy-modal-content').animate({ scrollTop: '+='+50*increment}, 10);
    },
    pickPlayList:function (){
        var keys=this.keys;
        var playlist=playlist_urls[keys.playlist_selection];
        var current_playlist=settings.playlist;
        if(playlist.id===current_playlist.id){
            this.goBack();
            return;
        }
        settings.saveSettings('playlist_id',playlist.id);
        $('#playlist-select-modal').modal('hide');
        $('#setting-page').addClass('hide');
        $('#app').hide();
        $('#loading-page').removeClass('hide');
        current_route='login-page';
        login_page.login();
    },
    showLockPlaylistModal:function (){
        $('input[name="lock"]').prop('checked', false);
        $('input[name="lock"][value="'+settings.lock_state+'"]').prop('checked',true)
        $('#lock-playlist-modal').modal('show');
        this.hoverLockPlaylist(0);
    },
    clickLockState:function (){
        var keys=this.keys;
        var current_item=this.lock_playlist_doms[keys.lock_playlist_selection];
        $(this.lock_playlist_doms).map(function (index, item){
            $(item).find('input').prop('checked',false);
        })
        $($(current_item).find('input')[0]).prop('checked',true);
    },
    saveLockState:function (){
        var keys=this.keys;
        var state=$('input[name="lock"]:checked').val();
        var that=this;
        var data={
            mac_address:mac_address,
            lock:state==='off' ? 0 : 1,
            app_type:platform
        }
        var encrypted_data=encryptRequest(data);
        $.ajax({
            method:'post',
            url:panel_url+'/save_lock_tate',
            data:{
                data:encrypted_data
            },
            success:function () {
                $('#lock-state-message').text('Account lock state saved successfully').addClass('visible');
                settings.saveSettings('lock_state',state,'');
                var lock_state_btn_title='Locked';
                if(state==='off')
                    lock_state_btn_title='Unlocked';
                $(that.menu_doms[2][4]).text(lock_state_btn_title);
                setTimeout(function () {
                    $('#lock-state-message').removeClass('visible');
                    if(keys.focused_part==="lock_playlist_btn_selection")
                        that.goBack();
                },3000)
            },
            error:function () {
                $('#lock-state-message').text('Sorry, some issue caused, please try again later').addClass('error').addClass('visible');
            }
        })
    },
    showCacheConfirmModal: function (){
        $('#clear-cache-modal').modal('show');
        this.hoverCacheConfirmModal(0);
    },
    clearCache: function (){
        current_route = 'login-page';
        $('#clear-cache-modal').modal('hide');
        $('#app').hide();
        $('#setting-page').addClass('hide');
        $('#loading-page').removeClass('hide');

        var local_storage_keys=[];
        Object.keys(localStorage).map(function (key){
            if(key.includes(storage_id) && !key.includes('terms_accepted'))
                local_storage_keys.push(key);
        })
        local_storage_keys.map(function (key){
            localStorage.removeItem(key);
        })
        settings.resetDefaultValues();
        login_page.getPlayListDetail();
    },
    hoverCacheConfirmModal:function (index){
        var keys=this.keys;
        keys.focused_part="clear_cache_selection";
        keys.clear_cache_selection=index;
        $(this.clear_cache_btns).removeClass('active');
        $(this.clear_cache_btns[index]).addClass('active');
    },
    hoverVideoKindItem:function (index){
        var keys=this.keys;
        keys.focused_part='video_kind_selection';
        keys.video_kind_selection=index;
        $(this.video_kind_doms).removeClass('active');
        $(this.video_kind_doms[index]).addClass('active');
    },
    hoverPlayListItem:function (index){
        var keys=this.keys;
        keys.focused_part='playlist_selection';
        keys.playlist_selection=index;
        $(this.playlist_items).removeClass('active');
        $(this.playlist_items[index]).addClass('active');
        moveScrollPosition($('#playlist-items-container'),this.playlist_items[index],'vertical',false)
    },
    hoverHideCategory:function(index){
        var keys=this.keys;
        if(index<0)
            keys.hide_category_modal=this.hide_category_doms.length+index;
        else
            keys.hide_category_modal=index;
        keys.focused_part='hide_category_modal';
        $(this.hide_category_doms).removeClass('active');
        $(this.hide_category_btn_doms).removeClass('active');
        $(this.hide_category_doms[keys.hide_category_modal]).addClass('active');
        moveScrollPosition($('#hide-modal-categories-container'),this.hide_category_doms[keys.hide_category_modal],'vertical',false)
    },
    hoverHideCategoryBtn:function (index){
        var keys=this.keys;
        keys.focused_part="hide_category_btn_selection";
        keys.hide_category_btn_selection=index;
        $(this.hide_category_doms).removeClass('active');
        $(this.hide_category_btn_doms).removeClass('active');
        $(this.hide_category_btn_doms[index]).addClass('active');
    },
    hoverParentControl:function(index){
        var keys=this.keys;
        keys.focused_part='parent_control_modal';
        keys.parent_control_modal=index;
        $(this.parent_control_doms).removeClass('active');
        $(this.parent_control_doms[index]).addClass('active');
    },
    hoverSettingMenu:function(v_index, h_index){
        var keys=this.keys;
        $(this.prev_focus_dom).removeClass('active');
        $(this.menu_doms[v_index][h_index]).addClass('active');
        keys.v_selection=v_index;
        keys.hor_keys[v_index]=h_index;
        keys.focused_part='menu_selection';
        this.prev_focus_dom=this.menu_doms[v_index][h_index];
    },
    hoverLanguage:function(index){
        var keys=this.keys;
        var language_doms=this.language_doms;
        keys.language_selection=index;
        $(language_doms).removeClass('active');
        $(language_doms[keys.language_selection]).addClass('active');
        moveScrollPosition($('#select-language-body'),language_doms[keys.language_selection],'vertical',false);
    },
    hoverTimeFormat:function (index){
        var keys=this.keys;
        keys.focused_part="time_format_modal";
        keys.time_format_modal=index;
        $(this.time_format_doms).removeClass('active');
        $(this.time_format_btn_doms).removeClass('active');
        $(this.time_format_doms[index]).addClass('active');
    },
    hoverTimeFormatBtn:function (index){
        var keys=this.keys;
        keys.focused_part="time_format_btn_selection";
        keys.time_format_btn_selection=index;
        $(this.time_format_doms).removeClass('active');
        $(this.time_format_btn_doms).removeClass('active');
        $(this.time_format_btn_doms[index]).addClass('active');
    },
    hoverLockPlaylist:function (index){
        var keys=this.keys;
        keys.focused_part="lock_playlist_selection";
        keys.lock_playlist_selection=index;
        $(this.lock_playlist_doms).removeClass('active');
        $(this.lock_playlist_doms).removeClass('active');
        $(this.lock_playlist_doms[index]).addClass('active');
    },
    hoverLockStateBtn:function (index){
        var keys=this.keys;
        keys.focused_part="lock_playlist_btn_selection";
        keys.lock_playlist_btn_selection=index;
        $(this.lock_playlist_doms).removeClass('active');
        $(this.lock_playlists_btns).removeClass('active');
        $(this.lock_playlists_btns[index]).addClass('active');
    },
    handleMenuClick:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                var v_selection=keys.v_selection;
                var h_selection=keys.hor_keys[v_selection]
                switch (v_selection) {
                    case 0:
                        switch (h_selection){
                            case 1:
                                this.increaseBufferSize(-1);
                                break;
                            case 2:
                                this.increaseBufferSize(1);
                                break;
                            case 3:
                                this.showVideoKindSelectionModal();
                                break;
                        }
                        // this.showParentControlModal();
                        break;
                    case 1:
                        // this.showHideCategoryModal('live');
                        switch (h_selection){
                            case 0:
                                this.increaseColorIndex('focus',-1);
                                break;
                            case 1:
                                this.increaseColorIndex('focus',1);
                                break;
                            case 2:
                                this.showPlayListModal();
                                break;
                            case 3:
                                this.showLanguages();
                                break;
                        }
                        break;
                    case 2:
                        switch (h_selection) {
                            case 0:
                                this.increaseColorIndex('epg', -1);
                                break;
                            case 1:
                                this.increaseColorIndex('epg', 1);
                                break;
                            case 2:
                                this.increaseColorIndex('bg-focus-color',-1)
                                break;
                            case 3:
                                this.increaseColorIndex('bg-focus-color',1)
                                break;
                            case 4:
                                this.showLockPlaylistModal();
                                break;
                        }
                        // this.showHideCategoryModal('movie');
                        break;
                    case 3:
                        switch (h_selection){
                            case 0:
                                this.showUserAccounts();
                                break;
                            case 1:
                                this.showPrivacyModal();
                                break;
                            case 2:
                                terms_page.init('setting-page');
                                break;
                            case 3:
                                this.showParentControlModal();
                                break;
                            case 4:
                                this.showTimeFormatModal();
                                break;
                            case 5:
                                this.showCacheConfirmModal();
                                break;
                        }
                        break;
                }
                break;
            case "parent_control_modal":
                if(keys.parent_control_modal<3)
                {
                    $(this.parent_control_doms[keys.parent_control_modal]).focus();
                    var that=this;
                    setTimeout(function () {
                        var tmp = $(that.parent_control_doms[keys.parent_control_modal]).val();
                        console.log(tmp,keys.parent_control_modal);
                        $(that.parent_control_doms[keys.parent_control_modal]).setSelectionRange(tmp.length, tmp.length);
                    },200)
                }
                else
                    $(this.parent_control_doms[keys.parent_control_modal]).trigger('click');
                break;
            case "hide_category_modal":
                $(this.hide_category_doms[keys.hide_category_modal]).trigger('click');
                break;
            case "theme_modal":
                $(this.theme_modal_options[keys.theme_modal]).trigger('click');
                break;
            case "language_selection":
                $(this.language_doms[keys.language_selection]).trigger('click');
                break;
            case "video_kind_selection":
                switch (keys.video_kind_selection){
                    case 0:
                        this.showHideCategoryModal('live');
                        break;
                    case 1:
                        this.showHideCategoryModal('vod');
                        break;
                    case 2:
                        this.showHideCategoryModal('series');
                        break;
                }
                break;
            case "hide_category_btn_selection":
                $(this.hide_category_btn_doms[keys.hide_category_btn_selection]).trigger('click');
                break;
            case "time_format_modal":
                $(this.time_format_doms[keys.time_format_modal]).trigger('click');
                break;
            case "time_format_btn_selection":
                $(this.time_format_btn_doms[keys.time_format_btn_selection]).trigger('click');
                break;
            case "playlist_selection":
                this.pickPlayList();
                break;
            case "lock_playlist_selection":
                $(this.lock_playlist_doms[keys.lock_playlist_selection]).trigger('click');
                break;
            case "lock_playlist_btn_selection":
                $(this.lock_playlists_btns[keys.lock_playlist_btn_selection]).trigger('click');
                break;
            case "clear_cache_selection":
                $(this.clear_cache_btns[keys.clear_cache_selection]).trigger('click');
                break;
        }
    },
    handleMenusUpDown:function(increment) {
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                var v_selection=keys.v_selection;
                v_selection+=increment;
                if(v_selection<0)
                    v_selection=0;
                if(v_selection>=this.menu_doms.length)
                    v_selection=this.menu_doms.length-1;
                this.hoverSettingMenu(v_selection,keys.hor_keys[v_selection]);
                break;
            case "hide_category_modal":
                keys.hide_category_modal+=increment;
                if(keys.hide_category_modal<0)
                    keys.hide_category_modal=0;
                if(keys.hide_category_modal>=this.hide_category_doms.length)
                    keys.hide_category_modal=this.hide_category_doms.length-1;
                $(this.hide_category_doms).removeClass('active');
                $(this.hide_category_doms[keys.hide_category_modal]).addClass('active');
                if(keys.hide_category_modal<this.hide_category_doms.length-3)
                    moveScrollPosition($('#hide-modal-categories-container'),this.hide_category_doms[keys.hide_category_modal],'vertical')
                break;
            case "hide_category_btn_selection":
                keys.hide_category_btn_selection+=increment;
                if(keys.hide_category_btn_selection<0)
                    keys.hide_category_btn_selection=0;
                if(keys.hide_category_btn_selection>=this.hide_category_btn_doms.length)
                    keys.hide_category_btn_selection=this.hide_category_btn_doms.length-1;
                this.hoverHideCategoryBtn(keys.hide_category_btn_selection);
                break;
            case "parent_control_modal":
                if(increment>0){
                    if(keys.parent_control_modal<3){
                        keys.parent_control_modal+=increment;
                    }
                }else{
                    if(keys.parent_control_modal>=3){
                        keys.parent_control_modal=2;
                    }else{
                        keys.parent_control_modal+=increment;
                        if(keys.parent_control_modal<0)
                            keys.parent_control_modal=0;
                    }
                }
                $(this.parent_control_doms).removeClass('active');
                $(this.parent_control_doms[keys.parent_control_modal]).addClass('active');
                break;
            case "theme_modal":
                var theme_options=this.theme_modal_options;
                keys.theme_modal+=increment;
                if(keys.theme_modal<0)
                    keys.theme_modal=theme_options.length-1;
                if(keys.theme_modal>=theme_options.length)
                    keys.theme_modal=0;
                $(theme_options).removeClass('active');
                $(theme_options[keys.theme_modal]).addClass('active');
                moveScrollPosition($('#theme-modal-body'),this.theme_modal_options[index],'vertical',false);
                break;
            case "language_selection":
                var language_doms=this.language_doms;
                keys.language_selection+=increment;
                if(keys.language_selection<0)
                    keys.language_selection=language_doms.length-1;
                if(keys.language_selection>=language_doms.length)
                    keys.language_selection=0;
                this.hoverLanguage(keys.language_selection);
                break;
            case "video_kind_selection":
                keys.video_kind_selection+=increment;
                if(keys.video_kind_selection<0)
                    keys.video_kind_selection=0;
                if(keys.video_kind_selection>=this.video_kind_doms.length)
                    keys.video_kind_selection=this.video_kind_doms.length-1;
                this.hoverVideoKindItem(keys.video_kind_selection);
                break;
            case "playlist_selection":
                keys.playlist_selection+=increment;
                if(keys.playlist_selection<0)
                    keys.playlist_selection=0;
                if(keys.playlist_selection>=this.playlist_items.length)
                    keys.playlist_selection=this.playlist_items.length-1;
                this.hoverPlayListItem(keys.playlist_selection);
                break;
            case "time_format_modal":
                keys.time_format_modal+=increment;
                if(keys.time_format_modal<0)
                    keys.time_format_modal=0;
                if(keys.time_format_modal>=this.time_format_doms.length)
                    keys.time_format_modal=this.time_format_doms.length-1;
                this.hoverTimeFormat(keys.time_format_modal);
                break;
            case "time_format_btn_selection":
                keys.time_format_btn_selection+=increment;
                if(keys.time_format_btn_selection<0)
                    keys.time_format_btn_selection=0;
                if(keys.time_format_btn_selection>=this.time_format_btn_doms.length)
                    keys.time_format_btn_selection=this.time_format_btn_doms.length-1;
                this.hoverTimeFormatBtn(keys.time_format_btn_selection);
                break;
            case "privacy_modal":
            case "terms_modal":
                this.movePrivacyScrollbar(increment);
                break;
            case "lock_playlist_selection":
                keys.lock_playlist_selection+=increment;
                if(keys.lock_playlist_selection<0)
                    keys.lock_playlist_selection=0;
                if(keys.lock_playlist_selection>1)
                    keys.lock_playlist_selection=1;
                this.hoverLockPlaylist(keys.lock_playlist_selection);
                break;
            case "lock_playlist_btn_selection":
                keys.lock_playlist_btn_selection+=increment;
                if(keys.lock_playlist_btn_selection<0)
                    keys.lock_playlist_btn_selection=0;
                if(keys.lock_playlist_btn_selection>1)
                    keys.lock_playlist_btn_selection=1;
                this.hoverLockStateBtn(keys.lock_playlist_btn_selection);
                break;
        }
    },
    handleMenuLeftRight:function(increment) {
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                var v_selection=keys.v_selection;
                var new_key=keys.hor_keys[v_selection]+increment
                if(new_key<0)
                    new_key=0;
                if(new_key>=this.hor_key_counts[v_selection])
                    new_key=this.hor_key_counts[v_selection]-1;
                this.hoverSettingMenu(v_selection, new_key);
                break;
            case "parent_control_modal":
                if(keys.parent_control_modal>=3){
                    keys.parent_control_modal+=increment;
                    if(keys.parent_control_modal<3)
                        keys.parent_control_modal=3;
                    if(keys.parent_control_modal>4)
                        keys.parent_control_modal=4;
                    $(this.parent_control_doms).removeClass('active');
                    $(this.parent_control_doms[keys.parent_control_modal]).addClass('active');
                }
                break;
            case "hide_category_modal":
                if(increment>0)
                    this.hoverHideCategoryBtn(keys.hide_category_btn_selection);
                break;
            case "hide_category_btn_selection":
                if(increment<0)
                    this.hoverHideCategory(keys.hide_category_modal);
                break;
            case "time_format_modal":
                if(increment>0)
                    this.hoverTimeFormatBtn(keys.time_format_btn_selection);
                break;
            case "time_format_btn_selection":
                if(increment<0)
                    this.hoverTimeFormat(keys.time_format_modal);
                break;
            case "lock_playlist_selection":
                if(increment>0)
                    this.hoverLockStateBtn(0)
                break;
            case "lock_playlist_btn_selection":
                if(increment<0)
                    this.hoverLockPlaylist(keys.lock_playlist_selection);
                break;
            case "clear_cache_selection":
                keys.clear_cache_selection=increment>0 ? 1 : 0;
                this.hoverCacheConfirmModal(keys.clear_cache_selection);
                break;
        }
    },
    HandleKey:function(e) {
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
            case tvKey.RETURN:
                this.goBack();
                break;
        }
    }
}