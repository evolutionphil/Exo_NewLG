"use strict";
var login_page={
    is_loading:false,
    device_id_fetched:false,
    keys:{
        focused_part:"main_area",
        main_area:0,
        network_issue_btn:0,
        expired_issue_btn:0,
        no_playlist_btn:0,
        playlist_error_btn:0
    },
    login_succeed:false,
    tried_panel_indexes:[],
    network_issue_btns:$('.network-issue-btn'),
    expired_issue_btns:$('.expired-issue-btn'),
    no_playlist_btns:$('.no-playlist-btn'),
    goBack:function(){
        turn_off_page.init('login-page');
    },
    showLoadImage:function(){
        $('#loading-issue-container').hide();
        $('#loading-page').removeClass('hide');
    },
    showLoginError:function(){
        $('.loading-issue-item').addClass('hide');
        $('#loading-issue-container').show();
    },
    showNetworkErrorModal:function(){
        this.device_id_fetched = false; // Reset flag to allow retry
        this.showLoginError()
        $('#network-issue-container').removeClass('hide');
        this.hoverNetworkIssueBtn(0);
    },
    reloadApp:function(){
        var that=this;
        this.device_id_fetched = false; // Reset flag for fresh start
        $('#loading-issue-container').hide();
        $('.loading-issue-item').addClass('hide');
        setTimeout(function () {
            that.fetchPlaylistInformation();
        },200)
    },
    continueDemoPlaylist:function(){
        var that=this;
        $('#loading-issue-container').hide();
        $('.loading-issue-item').addClass('hide');
        setTimeout(function () {
            that.login();
        },200)
    },
    exit:function(){
        exitApp();
    },
    enterActivationPage:function(){
        activation_page.init('login-page');
    },
    fetchPlaylistInformation:function(){
        if(this.is_loading)
            return;
        this.showLoadImage();
        var that=this;
        this.is_loading=true;
        var temps=pickPanelUrl(this.tried_panel_indexes);
        var url=temps[1],url_index=temps[0];
        var version=platform==='samsung' ? samsung_version : lg_version;
        var data={
            app_device_id:device_id,
            app_type:platform,
            version:version
        }

        // Debug logging
        console.log('=== DEBUG fetchPlaylistInformation ===');
        console.log('Panel URL:', url);
        console.log('Device ID:', device_id);
        console.log('Platform:', platform);
        console.log('Data to send:', data);

        var encrypted_data=encryptRequest(data);

        $.ajax({
            url: url+"/device_info",
            type: "POST",
            data:{
                data:encrypted_data
            },
            timeout: 15000, // 15 second timeout
            crossDomain: true, // Explicitly allow cross-domain
            success: function (data1) {
                console.log('=== DEBUG API Success ===');
                console.log('Raw response:', data1);

                try {
                    var data=decryptResponse(data1);
                    console.log('Decrypted data:', data);

                    // Check if response is valid
                    if(!data || typeof data !== 'object') {
                        console.error('Invalid response format:', data);
                        throw new Error('Invalid response format');
                    }

                    // Check if backend MAC generation failed
                    if(!data.mac_address || data.mac_address.trim() === '') {
                        console.error('Backend MAC generation failed - no MAC address returned');
                        throw new Error('No MAC address in response');
                    }

                    console.log('MAC Address received:', data.mac_address);

                    that.tried_panel_indexes=[];
                    localStorage.setItem(storage_id+'api_data',JSON.stringify(data));
                    that.loadApp(data);

                } catch(decryptError) {
                    console.error('=== DEBUG Decryption/Processing Error ===');
                    console.error('Error:', decryptError);
                    console.error('Raw response that failed:', data1);

                    // Try next panel URL
                    if(that.tried_panel_indexes.length<panel_urls.length){
                        that.is_loading=false;
                        that.tried_panel_indexes.push(url_index);
                        that.fetchPlaylistInformation();
                        return;
                    } else {
                        that.is_loading=false;
                        that.showNetworkErrorModal();
                        return;
                    }
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                console.log('=== DEBUG API Request Error ===');
                console.log('XHR Status:', xhr.status);
                console.log('XHR StatusText:', xhr.statusText);
                console.log('Text Status:', textStatus);
                console.log('Error Thrown:', errorThrown);
                console.log('Response Text:', xhr.responseText);
                console.log('Ready State:', xhr.readyState);
                console.log('Panel URL that failed:', url);
                console.log('Tried panel indexes:', that.tried_panel_indexes);
                console.log('Total panel URLs:', panel_urls.length);

                // Specific error handling
                if(xhr.status === 0) {
                    console.error('Network error - possible CORS, timeout, or connectivity issue');
                } else if(xhr.status >= 500) {
                    console.error('Server error:', xhr.status);
                } else if(xhr.status >= 400) {
                    console.error('Client error:', xhr.status);
                }

                if(that.tried_panel_indexes.length<panel_urls.length){
                    that.is_loading=false;
                    that.tried_panel_indexes.push(url_index);
                    console.log('Trying next panel URL, current failed indexes:', that.tried_panel_indexes);
                    that.fetchPlaylistInformation();
                }else{
                    console.log('All panel URLs failed, checking localStorage for cached data');
                    var api_data=localStorage.getItem(storage_id+'api_data');
                    if(api_data){
                        console.log('Using cached API data');
                        api_data=JSON.parse(api_data);
                        that.loadApp(api_data);
                    }else{
                        console.log('No cached data available, showing network error');
                        that.is_loading=false;
                        that.showNetworkErrorModal();
                    }
                }
            }
        });
    },
    loadApp:function(data){
        var today=moment().format('Y-MM-DD');
        saveData('mac_address', data.mac_address);
        settings.saveSettings('mac_address',data.mac_address,'');
        console.log(mac_address);
        $('#mac-address').text(mac_address);
        $('.mac-address').text(mac_address);
        saveData('playlist_urls',data.playlists);
        $('.loading-page-device-info-container').slideDown();
        saveData('languages',data.languages)
        saveData('expire_date',data.expire_date);
        saveData('is_trial',data.is_trial);
        saveData('focus_colors',data.focus_colors);
        saveData('epg_colors',data.epg_colors);
        saveData('bg_focus_colors',data.bg_focus_colors);

        console.log(data.site_domain);
        $('.site-domain').text(data.site_domain);
        console.log(data);
        if(data.lock)
            settings.saveSettings('lock_state',data.lock==0 ? 'off' : 'on','');
        if(settings.focus_color)
            assignColorCode(settings.focus_color,'focus');
        if(settings.epg_txt_color)
            assignColorCode(settings.epg_txt_color,'epg');
        if(settings.bg_focus_color)
            assignColorCode(settings.bg_focus_color,'bg_focus_color');

        this.is_loading=false;
        $('.expire-date').text(expire_date);
        saveData('demo_url',data.demo_url);
        if(data.expire_date<today){
            saveData('mac_valid',false);
            this.showLoginError()
            $('#expired-issue-container').removeClass('hide');
            this.hoverExpiredIssueBtn(0);
        }
        else{
            if(data.playlists.length==0)
                saveData('has_playlist',false)
            else
                saveData('has_playlist',true)
            this.login();
        }
    },
    getPlayListDetail:function(){
        // Prevent multiple calls to avoid infinite loading
        if(this.device_id_fetched) {
            console.log('Device ID already fetched, skipping duplicate call');
            return;
        }
        this.device_id_fetched = true;

        var that=this;
        // mac_address='a0:d0:5b:02:d7:6a';
        // mac_address='52:54:00:12:34:59';
        // mac_address='66:36:66:66:06:24';
        device_id='52:54:00:12:34:57'
        if(platform==='samsung'){
            try{
                // First try: Get DUID and send to backend for MAC generation
                var duid = webapis.productinfo.getDuid();
                if(duid && duid.trim() !== ''){
                    device_id = btoa(duid); // Base64 encode DUID like Tizen ID
                    this.fetchPlaylistInformation();
                    return;
                }
            }catch (e){
                console.log('DUID not available, trying Tizen ID fallback');
            }

            try{
                // Second try: Get Tizen ID and send to backend for MAC generation
                var temps=tizen.systeminfo.getCapability('http://tizen.org/system/tizenid')
                if(temps && temps.trim() !== ''){
                    device_id=btoa(temps); // Base64 encode Tizen ID
                    this.fetchPlaylistInformation();
                    return;
                }
            }catch (e){
                console.log('Tizen ID not available, using hardcoded fallback');
            }

            // Final fallback: Use hardcoded device ID
            this.fetchPlaylistInformation();
        }
        else if(platform==='lg'){
            webOS.service.request("luna://com.webos.service.sm", {
                method: "deviceid/getIDs",
                parameters: {
                    "idType": ["LGUDID"]
                },
                onSuccess: function (inResponse) {
                    // mac_address = "";
                    // var temp = inResponse.idList[0].idValue.replace(/['-]+/g, '');
                    // for (var i = 0; i <= 5; i++) {
                    //     mac_address += temp.substr(i * 2, 2);
                    //     if (i < 5)
                    //         mac_address += ":";
                    // }
                    device_id = inResponse.idList[0].idValue
                    that.fetchPlaylistInformation();
                },
                onFailure: function (inError) {
                    that.fetchPlaylistInformation();
                }
            });
        }
    },
    login:function(){
        console.log('=== DEBUG login() called ===');
        this.showLoadImage();
        
        // Check if user has uploaded playlists
        if(has_playlist && playlist_urls && playlist_urls.length > 0){
            var playlist_id = settings.playlist_id;
            var playlist_index = 0;
            
            // Find user's preferred playlist
            for(var i = 0; i < playlist_urls.length; i++){
                if(playlist_urls[i].id == playlist_id){
                    playlist_index = i;
                    break;
                }
            }
            
            var user_playlist = playlist_urls[playlist_index];
            console.log('=== DEBUG: Using user uploaded playlist ===');
            console.log('Using playlist:', user_playlist);
            settings.saveSettings('playlist', user_playlist, 'array');
            settings.saveSettings('playlist_id', user_playlist.id, '');
            parseM3uUrl();
            console.log('Parsed M3U URL - API Host:', api_host_url);
            this.proceed_login();
        } else {
            // No uploaded playlists, use local demo playlist as fallback
            var local_demo_playlist = {
                id: 'local_demo',
                name: 'Local Demo Playlist',
                url: './tv_channels_flixdemo_plus.m3u',
                type: 'general'
            };
            settings.saveSettings('playlist', local_demo_playlist, 'array');
            settings.saveSettings('playlist_id', local_demo_playlist.id, '');
            console.log('=== DEBUG: No user playlists found, using local demo playlist ===');
            console.log('Local playlist:', local_demo_playlist);
            parseM3uUrl();
            console.log('Parsed M3U URL - API Host:', api_host_url);
            this.proceed_login();
        }
    },
    
    
    
    
    goToPlaylistPageWithError:function(){
        console.log('=== DEBUG goToPlaylistPageWithError ===');
        this.is_loading = false;
        this.device_id_fetched = false; // Reset flag to prevent infinite loop

        // Initialize with empty data to keep app functional
        LiveModel.insertMoviesToCategories([])
        VodModel.insertMoviesToCategories([]);
        SeriesModel.insertMoviesToCategories([]);

        // Hide loading and show home page
        $('#loading-page').addClass('hide');
        home_page.init();

        // Show playlist error popup instead of redirecting
        this.showPlaylistErrorModal();
    },

    showPlaylistErrorModal:function(){
        console.log('=== Showing playlist error modal ===');
        $('#playlist-error-modal').modal('show');
        this.keys.focused_part = 'playlist_error_btn';
        this.keys.playlist_error_btn = 0;
        this.hoverPlaylistErrorBtn(0);
    },

    hoverPlaylistErrorBtn:function(index){
        var keys=this.keys;
        keys.focused_part='playlist_error_btn';
        keys.playlist_error_btn=index;
        $('.playlist-error-btn').removeClass('active');
        $('.playlist-error-btn').eq(index).addClass('active');
    },

    closePlaylistErrorModal:function(){
        $('#playlist-error-modal').modal('hide');
        this.keys.focused_part='main_area';
    },

    retryPlaylistLoad:function(){
        $('#playlist-error-modal').modal('hide');
        this.keys.focused_part='main_area';
        this.tried_panel_indexes = []; // Reset tried panels
        this.is_loading = false;
        this.device_id_fetched = false;
        
        console.log('=== DEBUG: Retrying with user playlist ===');
        console.log('User playlist:', settings.playlist);
        
        this.showLoadImage();
        setTimeout(() => {
            this.login();
        }, 500);
    },

    continueWithoutPlaylist:function(){
        $('#playlist-error-modal').modal('hide');
        this.keys.focused_part='main_area';
        this.is_loading = false;
        this.device_id_fetched = false;

        console.log('=== DEBUG: Continue without playlist called ===');
        console.log('Backend demo_url:', demo_url);
        
        // Temporarily store current user playlist
        var user_playlist = settings.playlist;
        var user_playlist_id = settings.playlist_id;
        
        var that = this;
        
        // Function to try local demo playlist
        function tryLocalDemo() {
            console.log('=== DEBUG: Trying local demo playlist ===');
            var local_demo_playlist = {
                id: 'local_demo',
                name: 'Local Demo Content',
                url: './tv_channels_flixdemo_plus.m3u',
                type: 'general'
            };
            
            // Set local demo playlist temporarily
            settings.playlist = local_demo_playlist;
            parseM3uUrl();
            
            $.ajax({
                method: 'get',
                url: './tv_channels_flixdemo_plus.m3u',
                timeout: 15000,
                success: function(data) {
                    console.log('=== DEBUG: Local demo content loaded successfully ===');
                    parseM3uResponse('type1', data);
                    
                    // Restore user's original playlist settings
                    settings.playlist = user_playlist;
                    settings.playlist_id = user_playlist_id;
                    
                    $('#loading-page').addClass('hide');
                    home_page.init();
                    
                    setTimeout(function() {
                        showToast('Demo Content', 'Using local demo content until your playlist is working');
                    }, 1000);
                },
                error: function(error) {
                    console.log('=== DEBUG: Local demo content also failed ===');
                    console.log('Error:', error);
                    
                    // Restore user's original playlist settings
                    settings.playlist = user_playlist;
                    settings.playlist_id = user_playlist_id;
                    
                    // Final fallback - empty data
                    LiveModel.insertMoviesToCategories([]);
                    VodModel.insertMoviesToCategories([]);
                    SeriesModel.insertMoviesToCategories([]);
                    
                    $('#loading-page').addClass('hide');
                    home_page.init();
                    
                    showToast('Error', 'No demo content available');
                }
            });
        }

        // First try backend demo URL if available
        if(demo_url && demo_url.trim() !== '') {
            console.log('=== DEBUG: Trying backend demo URL ===');
            console.log('Backend Demo URL:', demo_url);
            
            var backend_demo_playlist = {
                id: 'backend_demo',
                name: 'Backend Demo Content',
                url: demo_url,
                type: 'general'
            };
            
            // Set backend demo playlist temporarily
            settings.playlist = backend_demo_playlist;
            parseM3uUrl();
            
            $.ajax({
                method: 'get',
                url: demo_url,
                timeout: 15000,
                success: function(data) {
                    console.log('=== DEBUG: Backend demo content loaded successfully ===');
                    parseM3uResponse('type1', data);
                    
                    // Restore user's original playlist settings
                    settings.playlist = user_playlist;
                    settings.playlist_id = user_playlist_id;
                    
                    $('#loading-page').addClass('hide');
                    home_page.init();
                    
                    setTimeout(function() {
                        showToast('Demo Content', 'Using backend demo content until your playlist is working');
                    }, 1000);
                },
                error: function(error) {
                    console.log('=== DEBUG: Backend demo content failed, trying local ===');
                    console.log('Backend demo error:', error);
                    
                    // Restore user's original playlist settings first
                    settings.playlist = user_playlist;
                    settings.playlist_id = user_playlist_id;
                    
                    // Try local demo as fallback
                    tryLocalDemo();
                }
            });
        } else {
            console.log('=== DEBUG: No backend demo URL, trying local demo ===');
            tryLocalDemo();
        }
    },
    proceed_login:function(){
        if(this.is_loading)
            return;
        console.log('=== DEBUG proceed_login ===');
        console.log('Playlist type:', settings.playlist_type);
        console.log('API host URL:', api_host_url);
        console.log('Username:', user_name);
        console.log('Password:', password);
        $('#playlist-error').hide();
        LiveModel.init();
        VodModel.init();
        SeriesModel.init();
        var that=this;
        var playlist_type=settings.playlist_type;
        this.is_loading=true;
        if(playlist_type==='xtreme'){
            var  prefix_url=api_host_url+'/player_api.php?username='+user_name+'&password='+password+'&action=';
            var login_url=prefix_url.replace("&action=","");
            $.ajax({
                method:'get',
                url:login_url,
                success:function (data) {
                    if(typeof  data.server_info!="undefined")
                        calculateTimeDifference(data.server_info.time_now,data.server_info.timestamp_now)
                    if(typeof  data.user_info!="undefined"){
                        if(data.user_info.auth==0 || (typeof data.user_info.status!='undefined' && (data.user_info.status==='Expired' || data.user_info.status==='Banned'))){
                            that.is_loading=false;
                            that.goToPlaylistPageWithError();
                        }
                        else{
                            // if(data.user_info.exp_date==null)
                            //     $('.expire-date').text('Unlimited');
                            // else{
                            //     var exp_date_obj=moment(data.user_info.exp_date*1000);
                            //     $('.expire-date').text(exp_date_obj.format('Y-MM-DD'));
                            // }
                            $.when(
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_live_streams',
                                    success:function (data) {
                                        LiveModel.setMovies(data);
                                    }
                                }),
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_live_categories',
                                    success:function (data) {
                                        LiveModel.setCategories(data);
                                    }
                                }),
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_vod_categories',
                                    success:function (data) {
                                        VodModel.setCategories(data);
                                    }
                                }),
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_series_categories',
                                    success:function (data) {
                                        SeriesModel.setCategories(data);
                                    }
                                }),
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_vod_streams',
                                    success:function (data) {
                                        VodModel.setMovies(data);
                                    }
                                }),
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_series',
                                    success:function (data) {
                                        SeriesModel.setMovies(data);
                                    }
                                })
                            ).
                            then(function(){
                                try{
                                    LiveModel.insertMoviesToCategories();
                                    VodModel.insertMoviesToCategories();
                                    SeriesModel.insertMoviesToCategories();
                                    that.is_loading=false;
                                    that.retry_count = 0; // Reset retry count on success
                                    home_page.init();
                                }catch (e) {
                                    console.log(e);
                                    that.goToPlaylistPageWithError();
                                }
                            }).fail(function (e) {
                                console.log(e);
                                that.goToPlaylistPageWithError();
                            })
                        }
                    }
                },
                error:function(error){
                    console.log('=== DEBUG Xtreme API Error ===');
                    console.log('Error:', error);
                    console.log('Status:', error.status);
                    console.log('StatusText:', error.statusText);
                    that.is_loading=false;
                    that.goToPlaylistPageWithError();
                },
                timeout: 15000
            })
        }
        else{
            api_host_url=settings.playlist.url;
            $.ajax({
                method:'get',
                url:api_host_url,
                timeout:240000,
                success:function (data) {
                    console.log('=== DEBUG M3U Success ===');
                    parseM3uResponse('type1',data);
                   $('#loading-page').addClass('hide');
                    home_page.init();
                    that.is_loading=false;
                },
                error:function(error){
                    console.log('=== DEBUG M3U Error ===');
                    console.log('Error:', error);
                    console.log('Status:', error.status);
                    console.log('StatusText:', error.statusText);

                    that.is_loading=false;
                    that.goToPlaylistPageWithError();
                }
            })
        }
    },
    hoverNetworkIssueBtn:function(index){
        var keys=this.keys;
        keys.focused_part='network_issue_btn';
        keys.network_issue_btn=index;
        $(this.network_issue_btns).removeClass('active');
        $(this.network_issue_btns[index]).addClass('active');
    },
    hoverExpiredIssueBtn:function(index){
        var keys=this.keys;
        keys.focused_part='expired_issue_btn';
        keys.expired_issue_btn=index;
        $(this.expired_issue_btns).removeClass('active');
        $(this.expired_issue_btns[index]).addClass('active');
    },
    hoverNoPlaylistBtn:function(index){
        var keys=this.keys;
        keys.focused_part='no_playlist_btn';
        keys.no_playlist_btn=index;
        $(this.no_playlist_btns).removeClass('active');
        $(this.no_playlist_btns[index]).addClass('active');
    },
    handleMenuClick:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "network_issue_btn":
                $(this.network_issue_btns[keys.network_issue_btn]).trigger('click');
                break;
            case "no_playlist_btn":
                $(this.no_playlist_btns[keys.no_playlist_btn]).trigger('click');
                break;
            case "expired_issue_btn":
                $(this.expired_issue_btns[keys.expired_issue_btn]).trigger('click');
                break;
            case "playlist_error_btn":
                if(keys.playlist_error_btn === 0) {
                    this.retryPlaylistLoad();
                } else {
                    this.continueWithoutPlaylist();
                }
                break;
        }
    },
    handleMenuUpDown:function(increment){
        var keys=this.keys;
        if(keys.focused_part==="main_area"){
            keys.main_area+=increment;
            var elements=[$('#login-button')];
            elements.map(function(element){
                $(element).removeClass('active');
            })
            if(keys.main_area<0)
                keys.main_area=elements.length-1;
            if(keys.main_area>=elements.length)
                keys.main_area=0;
            $(elements[keys.main_area]).addClass('active');
        }
    },
    handleMenuLeftRight:function(increment){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "network_issue_btn":
                keys.network_issue_btn+=increment;
                if(keys.network_issue_btn<0)
                    keys.network_issue_btn=0;
                if(keys.network_issue_btn>=this.network_issue_btns.length)
                    keys.network_issue_btn=this.network_issue_btns.length-1;
                this.hoverNetworkIssueBtn(keys.network_issue_btn);
                break;
            case "expired_issue_btn":
                keys.expired_issue_btn+=increment;
                if(keys.expired_issue_btn<0)
                    keys.expired_issue_btn=0;
                if(keys.expired_issue_btn>1)
                    keys.expired_issue_btn=1;
                this.hoverExpiredIssueBtn(keys.expired_issue_btn);
                break;
            case "no_playlist_btn":
                keys.no_playlist_btn+=increment;
                if(keys.no_playlist_btn<0)
                    keys.no_playlist_btn=0;
                if(keys.no_playlist_btn>1)
                    keys.no_playlist_btn=1;
                this.hoverNoPlaylistBtn(keys.no_playlist_btn);
                break;
            case "playlist_error_btn":
                keys.playlist_error_btn+=increment;
                if(keys.playlist_error_btn<0)
                    keys.playlist_error_btn=0;
                if(keys.playlist_error_btn>1)
                    keys.playlist_error_btn=1;
                this.hoverPlaylistErrorBtn(keys.playlist_error_btn);
                break;
        }
    },
    HandleKey:function(e) {
        if(e.keyCode===tvKey.RETURN){
            this.goBack();
            return;
        }
        if(this.is_loading)
            return;
        switch(e.keyCode){
            case tvKey.DOWN:
                this.handleMenuUpDown(1);
                break;
            case tvKey.UP:
                this.handleMenuUpDown(-1);
                break;
            case tvKey.LEFT:
                this.handleMenuLeftRight(-1);
                break;
            case tvKey.RIGHT:
                this.handleMenuLeftRight(1);
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