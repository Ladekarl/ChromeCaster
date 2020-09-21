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
import {faAngleLeft, faAngleRight, faSearch} from '@fortawesome/free-solid-svg-icons';
import GoogleCast, {CastButton} from 'react-native-google-cast';
import CasterControl from './CasterControl';
import BlacklistService from '../Services/BlacklistService';

class Browser extends Component {
    webviewRef;

    constructor(props) {
        super(props);
        this.state = {
            searchBarText: null,
            url: 'https://google.com',
            canGoBack: false,
            canGoForward: false,
            currentUrl: null,
            casting: null,
            title: '',
            subtitle: '',
            duration: 0,
            currentTime: 0,
            isCasting: false,
            firstSearch: true,
            loading: false,
        };

        this.searchBar = new Animated.Value(0);
        this.backgroundColor = new Animated.Value(0);
    }

    componentDidMount() {
        // Connection failed
        GoogleCast.EventEmitter.addListener(GoogleCast.SESSION_START_FAILED, error => {
            console.error(error);
        });

        // Media started playing
        GoogleCast.EventEmitter.addListener(
            GoogleCast.MEDIA_PLAYBACK_STARTED,
            ({mediaStatus}) => {
                this.setState({
                    isCasting: true,
                });
            },
        );

        GoogleCast.EventEmitter.addListener(
            GoogleCast.MEDIA_PLAYBACK_ENDED,
            ({mediaStatus}) => {
                this.setState({
                    isCasting: false,
                    casting: null,
                });
            },
        );

        Dimensions.addEventListener('change', () => {
            this.forceUpdate();
        });
    }

    // Start the cast with selected media passed by function parameter
    startCast = (video, title, subtitle, duration, currentTime, image) => {
        GoogleCast.getCastState().then(state => {
            if (state === 'Connected') {
                GoogleCast.castMedia({
                    mediaUrl: video, // Stream media video uri
                    imageUrl: image, // 'Image video representative uri
                    title, // Media main title
                    subtitle, // Media subtitle
                    studio: 'Chromecaster', // Media or app owner
                    streamDuration: duration, // Stream duration in seconds
                    playPosition: currentTime, // Stream play position in seconds
                }).then(() => {
                    GoogleCast.launchExpandedControls();
                    this.setState({
                        casting: video,
                        title,
                        subtitle,
                        currentTime,
                        duration,
                    });
                }).catch(err => {
                    console.log(err);
                });
            } else if (state === 'NotConnected') {
                GoogleCast.showCastPicker();
            } else {
                console.log(state);
            }
        });
    };

    onMessage = event => {
        const {casting, isCasting, currentUrl, searchBarText} = this.state;
        console.log('onMessage', JSON.parse(event.nativeEvent.data));
        const res = JSON.parse(event.nativeEvent.data);
        const {src, currentTime, duration, poster} = res.message;
        if (!isCasting || !casting || casting !== 'videoSrc') {
            this.startCast(src, searchBarText, currentUrl, duration, currentTime, poster);
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
                    Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
                        get: function(){
                            return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
                        }
                    })
                    setInterval(function() {
                        window.open = function() {};
                        window.alert = function() {};
                        var videos = document.querySelectorAll('video');
                        for(var i = 0; i < videos.length; i++) {
                            var video = videos[i];
                            if(video.playing && video.src) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: "click",
                                    message: {
                                        src: video.src,
                                        currentTime: video.currentTime,
                                        duration: video.duration,
                                        poster: video.poster
                                    }
                                }));
                                video.pause();
                            }
                        }
                    }, 1000);
                });
            })();
        `;
    };

    searchBarTextChanged = (text) => {
        this.setState({
            searchBarText: text,
        });
    };

    navigateUrl = () => {
        if (this.state.firstSearch) {
            this.animate();
        }
        this.setState({
            url: this.parseSearchBarText(this.state.searchBarText),
        });
    };

    onNavigationStateChange = (navState) => {
        this.setState({
            canGoBack: navState.canGoBack,
            canGoForward: navState.canGoForward,
            currentUrl: navState.url,
            searchBarText: this.parseUrl(navState.url),
        });
    };

    setWebviewRef = (ref) => {
        this.webviewRef = ref;
    };

    parseUrl = url => {
        return BlacklistService.extractHostname(url);
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
        if (searchBarText[searchBarText.length - 1] !== '/') {
            buildUrl += '/';
        }

        return searchBarText.indexOf('.') > -1 ? buildUrl : 'https://www.google.com/search?q=' + encodeURI(searchBarText);
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
        ]).start(() => {
            this.setState({firstSearch: false});
        });
    };

    onShouldStartLoadWithRequest = (request) => {
        const {url} = this.state;
        if (!request || !request.url) {
            return true;
        }

        const requestUrl = request.url;

        if (BlacklistService.isBlacklistedUrl(requestUrl)) {
            return false;
        }

        if (requestUrl === url) {
            return true;
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

    render() {
        const {
            searchBarText,
            url,
            canGoBack,
            canGoForward,
            isCasting,
            firstSearch,
            loading,
        } = this.state;

        if (Platform.OS === 'ios' && !firstSearch) {
            GoogleCast.showIntroductoryOverlay();
        }

        const windowHeight = Dimensions.get('window').height;

        const yVal = this.searchBar.interpolate({
            inputRange: [0, 1],
            outputRange: [windowHeight / 2 + 30, 0],
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

        return (
            <Animated.View style={[styles.container, animColor]}>
                <SafeAreaView style={styles.container}>
                    {firstSearch &&
                    <View style={[styles.firstSearchContainer, {
                        top: windowHeight / 2 - 110,
                    }]}>
                        <Text style={styles.firstSearchText}>Use the search bar to find a video</Text>
                        <Image style={styles.arrowImage} source={require('../../images/arrow.png')}/>
                    </View>
                    }
                    <Animated.View style={[styles.searchBar, animSearchBar]}>
                        <View style={styles.searchInputContainer}>
                            <FontAwesomeIcon color={'#646464'} icon={faSearch}/>
                            <TextInput
                                multiline={false}
                                textAlign={'center'}
                                onChangeText={this.searchBarTextChanged}
                                underlineColorAndroid={'transparent'}
                                style={styles.searchInput}
                                value={searchBarText}
                                keyboardType={'web-search'}
                                clearTextOnFocus={true}
                                placeholder={'Search or enter website name'}
                                placeholderTextColor={'#646464'}
                                onSubmitEditing={this.navigateUrl}
                                autoCorrect={false}
                                returnKeyType={'go'}
                                autoCapitalize={'none'}
                                enablesReturnKeyAutomatically={true}
                            />
                        </View>
                    </Animated.View>
                    {!firstSearch &&
                    <WebView
                        ref={this.setWebviewRef}
                        allowsBackForwardNavigationGestures={true}
                        onNavigationStateChange={this.onNavigationStateChange}
                        onLoadStart={this.showLoading}
                        onLoadEnd={this.hideLoading}
                        source={{uri: url}}
                        allowsInlineMediaPlayback={true}
                        javaScriptEnabled={true}
                        onShouldStartLoadWithRequest={this.onShouldStartLoadWithRequest}
                        domStorageEnabled={true}
                        sharedCookiesEnabled={true}
                        cacheEnabled={true}
                        pullToRefreshEnabled={true}
                        thirdPartyCookiesEnabled={true}
                        scrollEnabled={true}
                        originWhitelist={['*']}
                        javaScriptCanOpenWindowsAutomatically={false}
                        injectedJavaScript={this.detectVideoPlayingJs()}
                        mediaPlaybackRequiresUserAction={true}
                        allowsFullscreenVideo={false}
                        onMessage={this.onMessage}
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
        paddingLeft: '5%',
        paddingRight: '5%',
        paddingTop: 10,
        paddingBottom: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#cdcdcd',
    },
    searchInputContainer: {
        flex: 1,
        backgroundColor: '#e2dfdf',
        justifyContent: 'space-between',
        borderRadius: 10,
        paddingLeft: 10,
        paddingRight: 20,
        paddingTop: 2,
        paddingBottom: 2,
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
