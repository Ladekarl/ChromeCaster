import React, {Component} from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faAngleLeft, faAngleRight, faHome, faRedo, faSearch} from '@fortawesome/free-solid-svg-icons';
import GoogleCast, {CastButton} from 'react-native-google-cast';
import CasterControl from './CasterControl';
import BlacklistService from '../Services/BlacklistService';
import logoImage from '../../images/logo.png';
import VideoService from '../Services/VideoService';
import WhitelistService from '../Services/WhitelistService';

const logoImageUri = Image.resolveAssetSource(logoImage).uri;

class Browser extends Component {
    webviewRef;
    alreadyAskedUrls = [];

    constructor(props) {
        super(props);
        this.state = {
            searchBarText: null,
            url: 'https://www.google.com/',
            canGoBack: false,
            canGoForward: false,
            currentUrl: 'https://google.com/',
            casting: null,
            title: '',
            subtitle: '',
            duration: 0,
            currentTime: 0,
            isCasting: false,
            firstSearch: true,
            loading: false,
            selectionStart: undefined,
            selectionEnd: undefined,
            shouldSelect: false,
        };

        this.searchBar = new Animated.Value(0);
        this.backgroundColor = new Animated.Value(0);
        this.padding = new Animated.Value(0);
    }

    componentDidMount() {
        // Connection failed
        GoogleCast.EventEmitter.addListener(GoogleCast.SESSION_START_FAILED, error => {
            console.error(error);
        });

        GoogleCast.EventEmitter.addListener(
            GoogleCast.MEDIA_STATUS_UPDATED,
            ({mediaStatus}) => {
                const {casting} = this.state;
                const playerState = mediaStatus.playerState;
                const castingStates = [2, 3];
                const isCasting = castingStates.indexOf(playerState) > -1;
                this.setState({
                    isCasting,
                    casting: isCasting ? casting : null,
                });
            },
        );


        Dimensions.addEventListener('change', () => {
            this.forceUpdate();
        });
    }

    startCast = (video, title, subtitle, duration, currentTime, mimeType = 'video/mp4') => {
        const internalStartCast = () => {
            GoogleCast.castMedia({
                mediaUrl: video,
                imageUrl: logoImageUri,
                title,
                subtitle,
                contentType: mimeType,
                isLive: true,
                studio: 'Chromecaster',
                streamDuration: duration,
                playPosition: currentTime,
            }).then(() => {
                this.setState({
                    casting: video,
                    title,
                    subtitle,
                    currentTime,
                    duration,
                });
            }).catch(err => {
                console.log(err);
                Alert.alert('Not connected', 'Please reconnect your chromecast');
            });
        };

        GoogleCast.getCastState().then(state => {
            if (state === 'Connected') {
                internalStartCast();
            } else if (state === 'NotConnected') {
                GoogleCast.EventEmitter.addListener(GoogleCast.SESSION_STARTED, () => {
                    internalStartCast();
                });
                GoogleCast.showCastPicker();
            } else {
                console.log(state);
                Alert.alert('No devices available', 'Could not find your chromecast');
            }
        });
    };

    onMessage = event => {
        const {casting, currentUrl, searchBarText} = this.state;
        console.log('onMessage', JSON.parse(event.nativeEvent.data));
        const res = JSON.parse(event.nativeEvent.data);
        const {src, currentTime, duration} = res.message;

        const alreadyAsked = this.alreadyAskedUrls.indexOf(src) > -1;

        if (casting !== src && !alreadyAsked) {
            this.alreadyAskedUrls.push(src);
            const durationVal = duration ? duration : undefined;
            const currentTimeVal = duration ? currentTime : undefined;
            const mimeType = VideoService.getMimetype(src);

            const alertTitle = mimeType ?
                'Ready to cast' :
                'Media type not recognized';
            const alertMessage = mimeType ?
                'Would you like to cast\n' + currentUrl + '?' :
                'Would you like to cast\n' + currentUrl + '\nanyway?';

            const startCasting = () => {
                this.startCast(src,
                    searchBarText,
                    currentUrl,
                    durationVal,
                    currentTimeVal,
                    mimeType);

                const pauseVideoCode = `
                    window.postMessage('', '*');
                    true;
                `;
                if (this.webviewRef) {
                    this.webviewRef.injectJavaScript(pauseVideoCode);
                }
            };

            Alert.alert(
                alertTitle,
                alertMessage,
                [
                    {
                        text: 'Cancel',
                        onPress: () => {
                        },
                        style: 'cancel',
                    },
                    {
                        text: 'OK', onPress: () => startCasting(),
                    },
                ],
                {cancelable: false});
        }
    };

    backButtonHandler = () => {
        if (this.webviewRef) {
            this.webviewRef.goBack();
        }
    };

    frontButtonHandler = () => {
        if (this.webviewRef) {
            this.webviewRef.goForward();
        }
    };

    detectVideoPlayingJs = () => {
        return `
            (function () {
                window.addEventListener("load", function() { 
                    setInterval(function() {
                        window.open = function() {};
                        window.alert = function() {};
                        var videos = document.querySelectorAll('video');
                        for(var i = 0; i < videos.length; i++) {
                            var video = videos[i];
                            if(video.playing && video.currentSrc) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: "click",
                                    message: {
                                        src: video.currentSrc,
                                        currentTime: video.currentTime,
                                        duration: video.duration,
                                        poster: video.poster,
                                        type: video.type
                                    }
                                }));
                            }
                        }
                    }, 1000);
                });
            })();
        `;
    };

    pauseVideoPlayingJs = () => `
        Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
            get: function(){
                return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
            }
        })
        window.addEventListener('message', function (e) {
            var videos = document.querySelectorAll('video');
            for (var i = 0; i < videos.length; i++) {
                var video = videos[i];
                if (video.playing) {
                    video.pause();
                }
            }
        });
        true;
        `;

    searchBarTextChanged = (text) => {
        this.setState({
            searchBarText: text,
            shouldSelect: false,
        });
    };

    navigateUrl = () => {
        const {firstSearch, searchBarText, url, currentUrl} = this.state;

        if (firstSearch) {
            this.animate();
        }
        const newUrl = this.parseSearchBarText(searchBarText);
        if (newUrl === url || newUrl === currentUrl) {
            this.webviewRef.reload();
        } else {
            this.setState({
                url: newUrl,
            });
        }
    };

    onNavigationStateChange = (navState) => {
        const {canGoBack, canGoForward, url} = navState;
        this.setState({
            canGoBack,
            canGoForward,
            currentUrl: url,
            searchBarText: this.parseUrl(url),
        }, () => {
            WhitelistService.addToWhitelist(url);
            this.alreadyAskedUrls = [];
        });
    };

    setWebviewRef = (ref) => {
        this.webviewRef = ref;
    };

    parseUrl = url => {
        return BlacklistService.extractDomainName(url);
    };

    parseSearchBarText = searchBarText => {
        let buildUrl = 'https://';
        const protocolIndex = searchBarText.indexOf('://');
        if (searchBarText.indexOf('https://www.') > -1) {
            buildUrl = searchBarText;
        } else if (searchBarText.indexOf('www.') > -1) {
            buildUrl += searchBarText;
        } else if (protocolIndex > -1) {
            buildUrl += 'www.' + searchBarText.substr(protocolIndex + 3, searchBarText.length);
        } else {
            buildUrl += 'www.' + searchBarText;
        }

        return searchBarText.indexOf('.') > -1 ? buildUrl : 'https://www.google.com/search?q=' + encodeURIComponent(searchBarText);
    };

    animate = () => {
        if (Platform.OS === 'android') {
            StatusBar.setBackgroundColor('#ffffff', true);
        }
        StatusBar.setBarStyle('dark-content', true);
        Animated.parallel([
            Animated.timing(this.searchBar, {
                toValue: 1,
                duration: 500,
                useNativeDriver: false,
            }),
            Animated.timing(this.backgroundColor, {
                toValue: 1,
                duration: 500,
                useNativeDriver: false,
            }),
            Animated.timing(this.padding, {
                toValue: 1,
                duration: 500,
                useNativeDriver: false,
            }),
        ]).start(() => {
            this.setState({firstSearch: false});
        });
    };

    onShouldStartLoadWithRequest = (request) => {
        const {url} = this.state;
        console.log('REQUEST:');
        console.log(request);

        if (!request || !request.url) {
            return true;
        }

        const requestUrl = request.url;

        if (WhitelistService.isWhitelistedUrl(requestUrl)) {
            return true;
        }

        const requestHostName = BlacklistService.extractHostname(requestUrl);
        const urlHostName = BlacklistService.extractHostname(url);
        if (requestHostName === urlHostName) {
            return true;
        }

        if (BlacklistService.isBlacklistedUrl(requestUrl)) {
            return false;
        }

        Alert.alert(
            'Are you sure?',
            'You are navigating to\n' + request.url,
            [
                {
                    text: 'Cancel',
                    onPress: () => {
                    },
                    style: 'cancel',
                },
                {text: 'OK', onPress: () => this.setState({url: requestUrl})},
            ],
            {cancelable: false});

        return false;
    };

    showLoading = () => {
        this.setState({
            loading: true,
        });
    };

    hideLoading = () => {
        this.setState({
            loading: false,
        });
    };

    onFocusTextInput = () => {
        const {currentUrl, firstSearch} = this.state;
        if (!firstSearch) {
            this.setState({
                searchBarText: currentUrl,
                selectionStart: 0,
                selectionEnd: currentUrl.length,
                shouldSelect: true,
            });
            Animated.timing(this.padding, {
                toValue: 0,
                duration: 100,
                useNativeDriver: false,
            }).start();
        }
    };

    onBlurTextInput = () => {
        const {currentUrl, firstSearch} = this.state;
        const searchBarText = this.parseUrl(currentUrl);
        if (!firstSearch) {
            this.setState({
                searchBarText,
                selectionStart: undefined,
                selectionEnd: undefined,
                shouldSelect: false,
            });
            Animated.timing(this.padding, {
                toValue: 1,
                duration: 100,
                useNativeDriver: false,
            }).start();
        }
    };

    onSelectionChangeTextInput = ({nativeEvent: {selection: {start, end}}}) => {
        this.setState({
            selectionStart: start,
            selectionEnd: end,
            shouldSelect: true,
        });
    };

    onPressHome = () => {
        const {currentUrl} = this.state;
        const url = 'https://www.google.com/';
        if (currentUrl === url) {
            this.webviewRef.reload();
        } else {
            this.setState({
                url,
            });
        }
    };

    onPressRefresh = () => {
        this.webviewRef.reload();
    };

    render() {
        const {
            searchBarText,
            url,
            canGoBack,
            canGoForward,
            isCasting,
            firstSearch,
            loading,
            selectionStart,
            selectionEnd,
            shouldSelect,
        } = this.state;

        if (Platform.OS === 'ios' && !firstSearch) {
            GoogleCast.showIntroductoryOverlay();
        }

        const windowHeight = Dimensions.get('window').height;

        const yVal = this.searchBar.interpolate({
            inputRange: [0, 1],
            outputRange: [windowHeight / 4 + 30, 0],
        });

        const backgroundColorVal = this.backgroundColor.interpolate({
            inputRange: [0, 1],
            outputRange: ['#0065ff', '#ffffff'],
        });

        const animSearchBar = {
            transform: [
                {
                    translateY: yVal,
                },
            ],
            borderBottomWidth: firstSearch ? 0 : StyleSheet.hairlineWidth,
        };

        const animColor = {
            backgroundColor: backgroundColorVal,
        };

        const paddingVal = this.padding.interpolate({
            inputRange: [0, 1],
            outputRange: [-20, 5],
        });

        const animLeftPadding = {
            marginLeft: paddingVal,
            marginRight: paddingVal,
            opacity: paddingVal,
        };

        const animRightPadding = {
            marginLeft: paddingVal,
            marginRight: paddingVal,
            opacity: paddingVal,
        };

        const selection = (!firstSearch && shouldSelect) ? {
            start: selectionStart,
            end: selectionEnd,
        } : undefined;

        return (
            <Animated.View style={[styles.container, animColor]}>
                <SafeAreaView style={styles.container}>
                    {firstSearch &&
                    <View style={[styles.firstSearchContainer, {
                        top: windowHeight / 4 - 110,
                    }]}>
                        <Text style={styles.firstSearchText}>Use the search bar to find a video</Text>
                        <Image style={styles.arrowImage} source={require('../../images/arrow.png')}/>
                    </View>
                    }
                    <Animated.View style={[styles.searchBar, animSearchBar]}>
                        <Animated.View style={[animLeftPadding, styles.outsideLeftIcon]}>
                            <TouchableOpacity onPress={this.onPressHome}>
                                <FontAwesomeIcon color={'#646464'} icon={faHome}/>
                            </TouchableOpacity>
                        </Animated.View>
                        <View style={styles.searchInputContainer}>
                            <FontAwesomeIcon color={'#646464'} icon={faSearch}/>
                            <TextInput
                                multiline={false}
                                textAlign={'center'}
                                onChangeText={this.searchBarTextChanged}
                                underlineColorAndroid={'transparent'}
                                decelerationRate={'normal'}
                                allowFontScaling={false}
                                onFocus={this.onFocusTextInput}
                                onBlur={this.onBlurTextInput}
                                onSelectionChange={this.onSelectionChangeTextInput}
                                autoFocus={true}
                                style={styles.searchInput}
                                value={searchBarText}
                                keyboardType={'web-search'}
                                placeholder={'Search or enter website name'}
                                placeholderTextColor={'#646464'}
                                onSubmitEditing={this.navigateUrl}
                                autoCorrect={false}
                                returnKeyType={'go'}
                                autoCapitalize={'none'}
                                enablesReturnKeyAutomatically={true}
                                selection={selection}
                            />
                        </View>
                        <Animated.View style={[animRightPadding, styles.outsideRightIcon]}>
                            <TouchableOpacity onPress={this.onPressRefresh}>
                                <FontAwesomeIcon color={'#646464'} icon={faRedo}/>
                            </TouchableOpacity>
                        </Animated.View>
                    </Animated.View>
                    {!firstSearch &&
                    <WebView
                        ref={this.setWebviewRef}
                        allowsBackForwardNavigationGestures={true}
                        onNavigationStateChange={this.onNavigationStateChange}
                        source={{uri: url}}
                        allowsInlineMediaPlayback={true}
                        javaScriptEnabled={true}
                        onShouldStartLoadWithRequest={this.onShouldStartLoadWithRequest}
                        domStorageEnabled={true}
                        sharedCookiesEnabled={true}
                        cacheEnabled={true}
                        pullToRefreshEnabled={true}
                        allowFileAccess={true}
                        decelerationRate={50}
                        allowFileAccessFromFileURLs={true}
                        allowUniversalAccessFromFileURLs={true}
                        thirdPartyCookiesEnabled={true}
                        scrollEnabled={true}
                        renderError={(url) => Alert.alert('Error', 'Cannot go to that page')}
                        originWhitelist={['*']}
                        javaScriptCanOpenWindowsAutomatically={false}
                        injectedJavaScriptForMainFrameOnly={false}
                        injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
                        injectedJavaScriptBeforeContentLoaded={this.pauseVideoPlayingJs()}
                        injectedJavaScript={this.detectVideoPlayingJs()}
                        mediaPlaybackRequiresUserAction={true}
                        allowsFullscreenVideo={false}
                        onMessage={this.onMessage}
                        useWebKit={true}
                    />
                    }
                    {!firstSearch && isCasting &&
                    <CasterControl/>
                    }
                    {!firstSearch &&
                    <View style={styles.navigationBar}>
                        <TouchableOpacity style={styles.navigationButton} disabled={!canGoBack}
                                          onPress={this.backButtonHandler}>
                            <FontAwesomeIcon color={canGoBack ? '#646464' : '#cdcdcd'} size={28} icon={faAngleLeft}/>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.navigationButton} disabled={!canGoForward}
                                          onPress={this.frontButtonHandler}>
                            <FontAwesomeIcon color={canGoForward ? '#646464' : '#cdcdcd'} size={28}
                                             icon={faAngleRight}/>
                        </TouchableOpacity>
                        <CastButton style={styles.castButton}/>
                    </View>
                    }
                    {loading &&
                    <View style={styles.activityContainer}>
                        <ActivityIndicator size={'large'} color={'#646464'}/>
                    </View>
                    }
                </SafeAreaView>
            </Animated.View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    firstSearchContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        width: '100%',
    },
    firstSearchText: {
        marginBottom: 10,
        fontSize: 18,
        color: '#ffffff',
        fontWeight: 'bold',
    },
    arrowImage: {
        tintColor: '#ffffff',
        height: 100,
        width: 100,
    },
    searchBar: {
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 10,
        paddingRight: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#cdcdcd',
    },
    outsideLeftIcon: {
        marginRight: 5,
    },
    outsideRightIcon: {
        marginLeft: 5,
    },
    searchInputContainer: {
        flex: 1,
        backgroundColor: '#e2dfdf',
        justifyContent: 'space-between',
        borderRadius: 10,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 2,
        paddingBottom: 2,
        marginLeft: 5,
        marginRight: 5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        margin: 5,
        fontSize: 17,
        color: '#222222',
        padding: 0,
        height: 20,
    },
    navigationBar: {
        flexDirection: 'row',
        paddingLeft: '10%',
        paddingRight: '10%',
        paddingTop: 5,
        paddingBottom: 5,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#cdcdcd',
    },
    navigationButton: {
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    castButton: {
        width: 30,
        height: 30,
    },
    activityContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default Browser;
