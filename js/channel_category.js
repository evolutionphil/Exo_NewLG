"use strict";
var channel_category_page={
    keys:{
        focused_part:'category_selection', // grid_part
        channel_selection:0,
        category_selection:0,
        category_page_selection:0,
        channel_page_selection:0,
        search_selection:0,
        movie_type_btn_selection:0,
        bottom_btn_selection:0
    },
    prev_route:'',
    buttons:$('.activation-btn'),
    activation_input:$('#activation-input')[0],
    is_loading:false,
    tried_panel_indexes:[],
    categories:[],
    category_doms:[],
    channel_doms:[],
    count_per_page:20,
    channel_count_per_page:15,
    category_total_pages:0,
    channel_total_pages:0,
    category_min_page:1,
    channel_min_page:1,
    category_max_page:1,
    channel_max_page:1,
    category_current_page:1,
    channel_current_page:1,
    paginate_display_max_count:4,
    current_page_categories:[],
    current_category_channels:[],
    current_page_channels:[],
    pagination_doms:[],
    category_group_count_html:'',
    category_pagination_html:'',
    current_category:null,
    search_btn_dom:$('.channel-category-search-btn')[0],
    movie_type_btns:$('.movie-type-btn-container'),
    bottom_btns:$('.channel-category-bottom-label-icon-container'),
    current_view:'',
    epg_channel_id:null,
    hover_channel_timer:null,
    current_epg_interval:null,
    current_epg_programmes:[],
    init:function(){
        this.epg_channel_id=null;
        this.hover_channel_timer=null;
        current_route='channel-category-page';
        var channels_text=current_words['channels'] ? current_words['channels'] : 'Channels';
        var categories=LiveModel.getCategories(false,true);
        this.categories=categories;
        $('#channel-category-group-count').text(categories.length);
        var html='';
        this.category_total_pages=this.getPagesCount(categories.length);
        this.renderPaginationBtns('category',1);
        for(var i=0;i<this.category_total_pages;i++){
            var page_categories=categories.slice(i*this.count_per_page,(i+1)*this.count_per_page);
            html+=
                '<div class="channel-category-page-container" data-page="'+(i+1)+'">';
            page_categories.map(function (item, index){
                html+=
                    '<div class="channel-category-item-container">\
                        <div class="channel-category-item-wrapper"\
                            onmouseenter="channel_category_page.hoverCategoryItem('+index+')" \
                        onclick="channel_category_page.handleMenuClick()" \
                    >\
                        <div class="channel-category-item-title-wrapper">\
                            <span class="channel-category-item-title">'+item.category_name+'</span> \
                            <img class="channel-category-list-icon" src="images/file.png">\
                        </div>\
                        <div class="channel-category-movie-counts-wrapper">\
                            <span class="channel-category-movie-counts">'+item.movies.length+'</span> \
                            <span class="channels-text" data-word_code="channels">'+channels_text+'</span> \
                        </div> \
                    </div>\
                </div>\
                '
            })
            html+='</div>'
        }
        $('#channel-category-contents-wrapper').html(html);
        $('#channel-category-channels-wrapper').addClass('hide');
        $('#channel-category-contents-wrapper').removeClass('hide');
        $('#channel-category-page').removeClass('hide');
        this.selectPage('category',1);
        this.hoverCategoryItem(0);
        this.current_view='category';
        if(settings.terms_accepted!=1)
            terms_page.init('channel-category-page');
    },
    goBack:function(){
        var keys=this.keys;
        switch (keys.focused_part){
            case "channel_selection":
            case "channel_page_selection":
                this.showCategoryPart();
                break;
            default:
                turn_off_page.init('channel-category-page');
                break;
        }
    },
    updateForFavouriteOrRecentCategory:function (){
        var keys=this.keys;
        var category=this.categories[keys.category_selection];
        var prev_page=this.channel_current_page;
        if(category.category_id==='favourite' && channel_page.favourite_changed || category.category_id==='recent'){
            var prev_channel_selection=keys.channel_selection;
            this.showChannels();
            this.channel_current_page=prev_page;
            if(prev_page>this.channel_total_pages)
                this.channel_current_page=this.channel_total_pages;
            this.selectPage('channel',this.channel_current_page);
            keys.channel_selection=prev_channel_selection;
            if(keys.channel_selection>=this.channel_doms.length || prev_page>this.channel_total_pages)
                keys.channel_selection=this.channel_doms.length-1;
            if(this.channel_doms.length>0)
                this.hoverChannelItem(keys.channel_selection);
        }
        var recent_channels_count=this.categories[0].movies.length;
        var favourite_channels_count=this.categories[1].movies.length;
        $(this.category_doms[0]).find('.channel-category-movie-counts').text(recent_channels_count);
        $(this.category_doms[1]).find('.channel-category-movie-counts').text(favourite_channels_count);
    },
    renderPaginationBtns:function (pagination_kind, min_page){
        var html='';
        var min_page_key, total_pages;
        if(pagination_kind==='category'){
            total_pages=this.category_total_pages;
            min_page_key='category_min_page';
        }else{
            total_pages=this.channel_total_pages;
            min_page_key='channel_min_page';
        }

        var max_page=min_page+this.paginate_display_max_count;
        if(max_page>total_pages)
            max_page=total_pages;
        this[pagination_kind+'_max_page']=max_page;
        for(var i=min_page;i<=max_page;i++){
            var page_index=(i-min_page+1);
            html+=
                '<div class="pagination-item border-focus" data-page="'+i+'"\
                    onmouseenter="channel_category_page.hoverPaginationItem(\''+pagination_kind+'\','+page_index+')" \
                    onclick="channel_category_page.selectPage(\''+pagination_kind+'\','+page_index+')" \
                >'
                    +i+
                '</div>'
        }
        $('#pagination-items-wrapper').html(html);
        this.pagination_doms=$('#pagination-container .pagination-item');
        this[min_page_key]=min_page;
    },
    selectPage:function (page_kind, page){
        if(page==='prev' || page==='next'){
            page_kind=this.getActiveKind()
            var min_page=this[page_kind+'_min_page'], max_page=this[page_kind+'_max_page'], total_pages=this[page_kind+'_total_pages'];
            if(page==='next'){
                if(max_page>=total_pages)
                    return;
                min_page=max_page+1;
                this.renderPaginationBtns(page_kind,min_page);
                this.selectPage(page_kind,min_page);
            }else{
                if(min_page<=1)
                    return;
                min_page=min_page-this.paginate_display_max_count-1;
                this.renderPaginationBtns(page_kind,min_page);
                this.selectPage(page_kind,min_page);
            }
            return;
        }
        var doms_key, container_id, current_page_key, page_items_container;
        if(page_kind==='category'){
            current_page_key='category_current_page'
            doms_key='category_doms';
            container_id='#channel-category-contents-wrapper';
            page_items_container=$('.channel-category-page-container[data-page='+page+']')[0]
            moveScrollPosition($(container_id),page_items_container,'horizontal',false);
            this[doms_key]=$(page_items_container).find('.channel-category-item-wrapper');
            this.keys.category_selection=0;
            this.current_page_categories=this.categories.slice((page-1)*this.count_per_page,page*this.count_per_page);
        }
        else{
            current_page_key='channel_current_page';
            var current_page_channels=this.current_category_channels.slice((page-1)*this.channel_count_per_page,page*this.channel_count_per_page);
            this.current_page_channels=current_page_channels;
            var html='';
            var count_per_page=this.channel_count_per_page;
            current_page_channels.map(function (item, index){
                  var num=(page-1)*count_per_page+index+1;
                html+=
                    '<div class="channel-item-container">\
                        <div class="channel-item-wrapper"\
                            onmouseenter="channel_category_page.hoverChannelItem('+index+')" \
                            onclick="channel_category_page.handleMenuClick()" \
                    >\
                        <span class="channel-item-icon-container">\
                            <img class="channel-item-icon" src="'+item.stream_icon+'" onerror="this.src=\'images/404.png\'"> \
                        </span> \
                        <div class="channel-item-info-wrapper">\
                            <div class="channel-item-title-wrapper">\
                                <span class="channel-item-number">'+(num)+'</span> \
                                <span class="channel-item-title max-line-2">'+item.name+'</span>\
                            </div>\
                            <div class="channel-item-current-programme epg-txt-color">\
                                No Information\
                            </div> \
                        </div> \
                    </div>\
                </div>\
                '
            })
            $('#channel-category-channels-wrapper').html(html);
            this.channel_doms=$('#channel-category-channels-wrapper .channel-item-wrapper');
            this.keys.channel_selection=0;
        }
        this[current_page_key]=page;
    },
    getPagesCount:function (total_count){
        var total_pages=Math.ceil(total_count/this.count_per_page);
        return total_pages;
    },
    getActiveKind:function (){
        var kind='category';
        if(!$('#channel-category-channels-wrapper').hasClass('hide'))
            kind='channel';
        return kind;
    },
    showChannels:function (){
        this.category_group_count_html=$('.channel-category-groups-count').html();
        this.category_pagination_html=$('#pagination-container').html();
        this.channel_total_pages=Math.ceil(this.current_category_channels.length/this.channel_count_per_page);
        this.renderPaginationBtns('channel',1);
        this.selectPage('channel',1);
        if(this.channel_doms[0])
            this.hoverChannelItem(0)
        else
            this.hoverPaginationItem('channel',0);
        $('#channel-category-contents-wrapper').addClass('hide');
        $('#channel-category-channels-wrapper').removeClass('hide');
        $('.channel-category-group-count-label').text(this.current_category.category_name);
        $('#channel-category-group-count').text(this.current_category_channels.length);
        this.current_view='channel';
    },
    showCategoryPart:function (){
        if(this.current_view==='category')
            return;
        clearTimeout(this.hover_channel_timer);
        clearInterval(this.current_epg_interval);
        $('#channel-category-channels-wrapper').addClass('hide');
        $('#channel-category-contents-wrapper').removeClass('hide');
        $('.channel-category-groups-count').html(this.category_group_count_html);
        $('#pagination-container').html(this.category_pagination_html);
        this.pagination_doms=$('#pagination-container .pagination-item');
        this.hoverCategoryItem(this.keys.category_selection);
        this.current_view='category';
    },
    showNextPage:function (increment){
        var keys=this.keys;
        var kind=this.current_view;
        var current_page=this[kind+'_current_page'];
        if(increment>0){
            var total_page=this[kind+'_total_pages'];
            if(current_page>=total_page)
                return;
            current_page+=1;
        }
        else{
            if(current_page<=1)
                return;
            current_page-=1;
        }
        this.selectPage(kind,current_page);
        var max_page=this[kind+'_max_page'], min_page=this[kind+'_min_page'];
        var page_selection=this.keys[kind+'_page_selection'];
        if(current_page>max_page){
            this.renderPaginationBtns(kind, max_page+1);
            page_selection=this.pagination_doms.length-1;
        }
        else if(current_page<min_page){
            min_page-=(this.paginate_display_max_count+1);
            this.renderPaginationBtns(kind, min_page);
            page_selection=0;
        }
        switch (keys.focused_part){
            case "category_selection":
            case "channel_selection":
                if(kind==='category')
                    this.hoverCategoryItem(0);
                else
                    this.hoverChannelItem(0)
                break;
            case "category_page_selection":
            case "channel_page_selection":
                this.hoverPaginationItem(kind, page_selection);
                break;
        }
    },
    reloadApp:function () {
        current_route = 'login-page';
        $('#app').hide();
        $('#loading-page').removeClass('hide');
        $(this.prev_focus_dom).removeClass('active');
        
        // Reset login page state to prevent infinite loops
        login_page.is_loading = false;
        login_page.device_id_fetched = false;
        login_page.tried_panel_indexes = [];
        
        // Hide any existing error modals
        $('#playlist-error-modal').modal('hide');
        $('.loading-issue-item').addClass('hide');
        $('#loading-issue-container').hide();
        
        login_page.getPlayListDetail();
    },
    goToSettingsPage:function (){
        clearTimeout(this.hover_channel_timer);
        clearInterval(this.current_epg_interval);
        $('#channel-category-page').addClass('hide');
        setting_page.init('channel-category-page');
    },
    showCurrentChannelEpg:function (){
        var temp=LiveModel.getNextProgrammes(this.current_epg_programmes);
        var current_program_exist=temp.current_program_exist;
        var programmes=temp.programmes;
        var current_program,current_program_title="No Information"
        if(current_program_exist){
            current_program = programmes[0];
            current_program_title = getAtob(current_program.title);
                // getLocalChannelTime(current_program.start).format('M-D HH:mm')+' - '
                // + getLocalChannelTime(current_program.stop).format('M-D HH:mm')+' '
        }
        var keys=this.keys;
        $(this.channel_doms[keys.channel_selection]).find('.channel-item-current-programme').html(current_program_title);
    },
    updateCurrentChannelEpg:function (){
        this.showCurrentChannelEpg();
        clearTimeout(this.current_epg_interval);
        var that=this;
        this.current_epg_interval=setTimeout(function (){
            that.showCurrentChannelEpg();
        },60000)
    },
    getCurrentChannelEpg:function (){
        var keys=this.keys;
        var current_channel=this.current_category_channels[keys.channel_selection];
        this.current_epg_programmes=[];
        this.showCurrentChannelEpg();
        var that=this;
        
        // Try to get EPG data from XMLTV Manager
        var xmltvData = XmltvManager.getChannelEpg(current_channel.stream_id);
        if(xmltvData && xmltvData.programmes) {
            that.current_epg_programmes=xmltvData.programmes;
            that.updateCurrentChannelEpg();
            that.epg_channel_id=current_channel.stream_id;
            console.log('EPG data loaded from XMLTV Manager for channel ' + current_channel.stream_id);
            return;
        }
        
        // If no XMLTV data available, use loading state
        console.log('EPG data loading for channel ' + current_channel.stream_id + ' via XMLTV Manager');
        
        // Start XMLTV fetch if not already loading (non-blocking)
        if (settings.playlist_type === 'xtreme' && !XmltvManager.isLoading) {
            XmltvManager.fetchXmltvAsync(false);
        }
        
        // Set up a callback to update when XMLTV data becomes available
        var updateCallback = function(channelId, programmes) {
            if (channelId === current_channel.stream_id && programmes) {
                that.current_epg_programmes = programmes;
                that.updateCurrentChannelEpg();
                that.epg_channel_id = current_channel.stream_id;
                // Remove this callback after use
                XmltvManager.removeEpgUpdateCallback(updateCallback);
            }
        };
        
        XmltvManager.onEpgUpdate(updateCallback);
        
        // Also check again after a short delay in case data loads quickly
        setTimeout(function() {
            var updatedXmltvData = XmltvManager.getChannelEpg(current_channel.stream_id);
            if(updatedXmltvData && updatedXmltvData.programmes) {
                that.current_epg_programmes = updatedXmltvData.programmes;
                that.updateCurrentChannelEpg();
                that.epg_channel_id = current_channel.stream_id;
                XmltvManager.removeEpgUpdateCallback(updateCallback);
            }
        }, 2000);
    },
    hoverCategoryItem:function (index){
        var keys=this.keys;
        keys.focused_part='category_selection';
        keys.category_selection=index;
        $(this.prev_focus_dom).removeClass('active');
        $(this.category_doms[index]).addClass('active');
        this.prev_focus_dom=this.category_doms[index];
    },
    hoverPaginationItem:function (kind,index){
        var keys=this.keys;
        var focused_part=kind+'_page_selection'
        keys.focused_part=focused_part;
        if(index<0)
            index=this.pagination_doms.length-1;
        keys[keys.focused_part]=index;
        $(this.prev_focus_dom).removeClass('active')
        $(this.pagination_doms[index]).addClass('active');
        this.prev_focus_dom=this.pagination_doms[index];
    },
    hoverChannelItem:function (index){
        var keys=this.keys;
        keys.focused_part='channel_selection';
        keys.channel_selection=index;
        $(this.prev_focus_dom).removeClass('active');
        $(this.channel_doms[keys.channel_selection]).addClass('active');
        this.prev_focus_dom=this.channel_doms[keys.channel_selection];
        clearTimeout(this.hover_channel_timer);
        clearInterval(this.current_epg_interval);
        var current_channel=this.current_category_channels[keys.channel_selection];
        if(settings.playlist_type==='xtreme' && current_channel.stream_id!=this.epg_channel_id){
            var that=this;
            this.hover_channel_timer=setTimeout(function (){
                that.getCurrentChannelEpg();
            },400)
        }
    },
    hoverSearchBtn:function (){
        this.keys.focused_part="search_selection";
        $(this.prev_focus_dom).removeClass('active');
        $(this.search_btn_dom).addClass('active');
        this.prev_focus_dom=this.search_btn_dom;
    },
    hoverMovieTypeBtn:function (index){
        var keys=this.keys;
        keys.focused_part="movie_type_btn_selection";
        keys.movie_type_btn_selection=index;
        $(this.prev_focus_dom).removeClass('active');
        $(this.movie_type_btns[index]).addClass('active');
        this.prev_focus_dom=this.movie_type_btns[index];
    },
    hoverBottomBtn:function (index){
        var keys=this.keys;
        keys.focused_part='bottom_btn_selection';
        keys.bottom_btn_selection=index;
        $(this.prev_focus_dom).removeClass('active');
        $(this.bottom_btns[index]).addClass('active');
        this.prev_focus_dom=this.bottom_btns[index];
    },
    handleMenuLeftRight:function(increment){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "search_selection":
                if(increment<0){
                    var kind=this.getActiveKind();
                    this.hoverPaginationItem(kind,this.pagination_doms.length-1)
                }else
                    this.hoverMovieTypeBtn(0)
                break;
            case "movie_type_btn_selection":
                keys.movie_type_btn_selection+=increment;
                if(keys.movie_type_btn_selection<0){
                    this.hoverSearchBtn();
                    return;
                }
                if(keys.movie_type_btn_selection>=2)
                    keys.movie_type_btn_selection=1;
                this.hoverMovieTypeBtn(keys.movie_type_btn_selection);
                break;
            case "category_page_selection":
                keys.category_page_selection+=increment;
                if(keys.category_page_selection<0)
                    keys.category_page_selection=0;
                if(keys.category_page_selection>=this.pagination_doms.length){
                    keys.category_page_selection=this.pagination_doms.length-1;
                    this.hoverSearchBtn();
                    return;
                }
                this.hoverPaginationItem('category',keys.category_page_selection);
                break;
            case "channel_page_selection":
                keys.channel_page_selection+=increment;
                if(keys.channel_page_selection<0)
                    keys.channel_page_selection=0;
                if(keys.channel_page_selection>=this.pagination_doms.length){
                    keys.channel_page_selection=this.pagination_doms.length-1;
                    this.hoverSearchBtn();
                    return;
                }
                this.hoverPaginationItem('channel',keys.channel_page_selection);
                break;
            case "category_selection":
                var remainder=keys.category_selection % 4;
                var prev_category_selection=keys.category_selection;
                if(remainder==0 && increment<0){
                    if(this.category_current_page>this.category_min_page){
                        this.selectPage('category',this.category_current_page-1);
                        var new_category_selection=prev_category_selection+3;
                        if(new_category_selection>=this.category_doms.length)
                            new_category_selection=this.category_doms.length-1;
                        this.hoverCategoryItem(new_category_selection);
                    }
                    return;
                }
                if((remainder==3 || keys.category_selection==this.category_doms.length-1) && increment>0){
                    if(this.category_current_page<this.category_max_page){
                        this.selectPage('category',this.category_current_page+1);
                        var new_category_selection=prev_category_selection-3;
                        if(new_category_selection>=this.category_doms.length){
                            var quotient=Math.ceil(this.category_doms.length/4)-1
                            new_category_selection=quotient*4;
                        }
                        this.hoverCategoryItem(new_category_selection);
                    }
                    return;
                }
                keys.category_selection+=increment;
                this.hoverCategoryItem(keys.category_selection);
                break;
            case "channel_selection":
                var remainder=keys.channel_selection % 3;
                var prev_channel_selection=keys.channel_selection;
                var new_channel_selection
                if(remainder==0 && increment<0){
                    if(this.channel_current_page>this.channel_min_page){
                        this.selectPage('channel',this.channel_current_page-1);
                        new_channel_selection=prev_channel_selection+2;
                        if(new_channel_selection>=this.channel_doms.length)
                            new_channel_selection=this.channel_doms.length-1;
                        this.hoverChannelItem(new_channel_selection);
                    }
                    return;
                }
                if((remainder==2 || keys.channel_selection==this.channel_doms.length-1) && increment>0){
                    if(this.channel_current_page<this.channel_max_page){
                        this.selectPage('channel',this.channel_current_page+1);
                        new_channel_selection=prev_channel_selection-2;
                        if(new_channel_selection>=this.channel_doms.length){
                            var quotient=Math.ceil(this.channel_doms.length/3)-1
                            new_channel_selection=quotient*3;
                        }
                        this.hoverChannelItem(new_channel_selection);
                    }
                    return;
                }
                keys.channel_selection+=increment;
                this.hoverChannelItem(keys.channel_selection);
                break;
            case "bottom_btn_selection":
                keys.bottom_btn_selection+=increment;
                if(keys.bottom_btn_selection<0)
                    keys.bottom_btn_selection=0;
                if(keys.bottom_btn_selection>=this.bottom_btns.length)
                    keys.bottom_btn_selection=this.bottom_btns.length-1;
                this.hoverBottomBtn(keys.bottom_btn_selection);
                break;
        }
    },
    handleMenuUpDown:function(increment){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "search_selection":
            case "movie_type_btn_selection":
                if(increment<0)
                    return;
                var kind=this.getActiveKind();
                keys.focused_part=kind+'_page_selection';
                this.handleMenuUpDown(increment);
                break;
            case "category_selection":
                if(keys.category_selection<4 && increment<0){
                    this.hoverPaginationItem('category',keys.category_page_selection);
                    return;
                }
                if(checkVerticalMovable(this.category_doms.length,4,keys.category_selection,increment)){
                    keys.category_selection+=4*increment;
                    if(keys.category_selection>=this.category_doms.length)
                        keys.category_selection=this.category_doms.length-1;
                    this.hoverCategoryItem(keys.category_selection);
                }else if(increment>0){
                    var quotient=Math.ceil(this.category_doms.length/4)-1;
                    if(keys.category_selection>=quotient*4)
                        this.hoverBottomBtn(0);
                }
                break;
            case "category_page_selection":
                if(increment>0){
                    if(keys.category_selection>4)
                        keys.category_selection=3;
                    if(!keys.category_selection)
                        keys.category_selection=0;
                    this.hoverCategoryItem(keys.category_selection);
                }
                break;
            case "channel_page_selection":
                if(increment>0){
                    if(keys.channel_selection>3)
                        keys.channel_selection=2;
                    if(!keys.channel_selection)
                        keys.channel_selection=0;
                    this.hoverChannelItem(keys.channel_selection);
                }
                break;
            case "channel_selection":
                if(keys.channel_selection<3 && increment<0){
                    this.hoverPaginationItem('channel',keys.channel_page_selection);
                    return;
                }
                if(checkVerticalMovable(this.channel_doms.length,3,keys.channel_selection,increment)){
                    keys.channel_selection+=3*increment;
                    if(keys.channel_selection>=this.channel_doms.length)
                        keys.channel_selection=this.channel_doms.length-1;
                    this.hoverChannelItem(keys.channel_selection);
                }else if(increment>0){
                    var quotient=Math.ceil(this.channel_doms.length/3)-1;
                    if(keys.channel_selection>=quotient*3)
                        this.hoverBottomBtn(0);
                }
                break;
            case "bottom_btn_selection":
                if(increment>0)
                    return;
                var kind=this.getActiveKind();
                var quotient;
                if(kind==='category'){
                    quotient=Math.ceil(this.category_doms.length / 4) - 1;
                    this.hoverCategoryItem(quotient*4);
                }else{
                    if(this.channel_doms.length>0){
                        quotient=Math.ceil(this.channel_doms.length / 3) - 1;
                        this.hoverChannelItem(quotient*3);
                    }
                    else
                        this.hoverPaginationItem('channel',0)
                }
                break;

        }
    },
    handleMenuClick:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "category_page_selection":
                $(this.pagination_doms[keys.category_page_selection]).trigger('click');
                break;
            case "channel_page_selection":
                $(this.pagination_doms[keys.channel_page_selection]).trigger('click');
                break;
            case "category_selection":
                var category=this.current_page_categories[keys.category_selection];
                this.current_category_channels=category.movies;
                this.current_category=category;
                if(!checkForAdult(category,'category',[]))
                    this.showChannels();
                else
                    parent_confirm_page.init('channel-category-page');
                break;
            case "channel_selection":
                clearTimeout(this.hover_channel_timer);
                clearInterval(this.current_epg_interval);
                channel_page.init(this.current_page_channels[keys.channel_selection], true,'channel-category-page');
                break;
            case "movie_type_btn_selection":
                clearTimeout(this.hover_channel_timer);
                clearInterval(this.current_epg_interval);
                var movie_type=keys.movie_type_btn_selection==0 ? 'vod' : 'series'
                vod_series_page.init(movie_type);
                break;
            case "bottom_btn_selection":
                switch (keys.bottom_btn_selection){
                    case 0:
                        clearTimeout(this.hover_channel_timer);
                        clearInterval(this.current_epg_interval);
                        help_page.init('channel-category-page');
                        break;
                    case 1:
                        turn_off_page.init('channel-category-page');
                        break;
                    case 2:
                        clearTimeout(this.hover_channel_timer);
                        clearInterval(this.current_epg_interval);
                        this.reloadApp();
                        break;
                    case 3:
                        this.goToSettingsPage();
                        break;
                    case 4:
                        this.showCategoryPart();
                        break;
                    case 5:
                        this.showNextPage(-1);
                        break;
                    case 6:
                        this.showNextPage(1);
                        break;

                }
                break;
            case "search_selection":
                $('#channel-category-page').addClass('hide');
                search_page.init('channel-category-page');
                break;
        }
    },
    HandleKey:function(e){
        if(this.is_loading){
            if(e.keyCode===tvKey.RETURN){
                showLoader(false);
                this.is_loading=false;
                this.goBack();
            }
            return;
        }
        switch(e.keyCode){
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
            case tvKey.RETURN:
                this.goBack();
                break;
            case tvKey.CH_UP:
                this.showNextPage(-1);
                break;
            case tvKey.CH_DOWN:
                this.showNextPage(1)
                break;
            case tvKey.BLUE:
                this.showCategoryPart();
                break;
            case tvKey.GREEN:
                vod_series_page.init('vod');
                break;
            case tvKey.YELLOW:
                vod_series_page.init('series');
                break;
            case tvKey.RED:
                this.goToSettingsPage();
                break;
        }
    }
}