import React, {Component} from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Image,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import GoogleCast from 'react-native-google-cast';
import CasterControl from './CasterControl';
import UrlService from '../Services/UrlService';
import logoImage from '../../images/logo.png';
import VideoService from '../Services/VideoService';
import BrowserWebView from './BrowserWebView';
import NavigationBar from './NavigationBar';
import BrowserSearchBar from './BrowserSearchBar';

const logoImageUri = Image.resolveAssetSource(logoImage).uri;

class Browser extends Component {
    webviewRef;

    constructor(props) {
        super(props);
        this.webviewRef = React.createRef();
        this.state = {
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
        };

        this.backgroundColor = new Animated.Value(0);
        this.searchBar = new Animated.Value(0);
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

    componentWillUnmount(): void {
        clearTimeout(this.loadingTimer);
    }

    pauseVideos = () => {
        const pauseVideoCode = `
                    window.postMessage('', '*');
                    true;
                `;
        if (this.webviewRef && this.webviewRef.current) {
            this.webviewRef.current.injectJavaScript(pauseVideoCode);
        }
    };

    onShouldStartLoadWithRequest = (request) => {
        const requestUrl = request.url;
        Alert.alert(
            'Are you sure?',
            'You are navigating to\n' + requestUrl,
            [
                {
                    text: 'Cancel',
                    onPress: () => {
                    },
                    style: 'cancel',
                },
                {text: 'OK', onPress: () => this.navigateUrl(requestUrl)},
            ],
            {cancelable: false});

        return false;
    };

    startCast = (video, title, subtitle, duration, currentTime, mimeType = 'video/mp4') => {
        this.pauseVideos();

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
                    isCasting: true,
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
        const {casting, currentUrl} = this.state;
        console.log('onMessage', JSON.parse(event.nativeEvent.data));
        const res = JSON.parse(event.nativeEvent.data);
        const {src, currentTime, duration} = res.message;


        if (casting !== src) {
            const durationVal = duration ? duration : undefined;
            const currentTimeVal = duration ? currentTime : undefined;
            const mimeType = VideoService.getMimetype(src);

            const alertTitle = mimeType ?
                'Ready to cast' :
                'Media type not recognized';
            const alertMessage = 'Would you like to cast\n' + currentUrl + '?';

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
                        text: 'OK', onPress: () => this.startCast(src,
                            UrlService.parseUrl(currentUrl),
                            currentUrl,
                            durationVal,
                            currentTimeVal,
                            mimeType),
                    },
                ],
                {cancelable: false});
        }
    };

    backButtonHandler = () => {
        if (this.webviewRef && this.webviewRef.current) {
            this.webviewRef.current.goBack();
        }
    };

    frontButtonHandler = () => {
        if (this.webviewRef && this.webviewRef.current) {
            this.webviewRef.current.goForward();
        }
    };

    navigateHome = () => {
        this.navigateUrl('https://www.google.com');
    };

    navigateUrl = (url) => {
        const {currentUrl} = this.state;
        if (currentUrl === url) {
            this.reloadPage();
        } else {
            this.setState({
                url,
            });
        }
    };

    reloadPage = () => {
        if (this.webviewRef && this.webviewRef.current) {
            this.webviewRef.current.reload();
        }
    };

    onNavigationStateChange = (navState) => {
        const {canGoBack, canGoForward, url} = navState;
        this.setState({
            canGoBack,
            canGoForward,
            currentUrl: url,
        });
    };

    onSearchBarAnimationFinished = () => {
        if (Platform.OS === 'android') {
            StatusBar.setBackgroundColor('#ffffff', true);
        }
        StatusBar.setBarStyle('dark-content', true);
        this.setState({firstSearch: false});
    };

    searchBarAnimations = () => {
        return [
            Animated.timing(this.backgroundColor, {
                toValue: 1,
                duration: 500,
                useNativeDriver: false,
            }),
        ];
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

    onSubmitTextInput = (newUrl) => {
        const {currentUrl, url, firstSearch} = this.state;

        if (newUrl === url || newUrl === currentUrl) {
            this.reloadPage();
        } else {
            this.navigateUrl(newUrl);
        }

        if (firstSearch) {
            this.animate();
        }
    };

    render() {
        const {
            url,
            canGoBack,
            canGoForward,
            isCasting,
            firstSearch,
            currentUrl,
        } = this.state;

        if (Platform.OS === 'ios' && !firstSearch) {
            GoogleCast.showIntroductoryOverlay();
        }

        const windowHeight = Dimensions.get('window').height;

        const backgroundColorVal = this.backgroundColor.interpolate({
            inputRange: [0, 1],
            outputRange: ['#0065ff', '#ffffff'],
        });

        const animColor = {
            backgroundColor: backgroundColorVal,
        };

        const yVal = this.searchBar.interpolate({
            inputRange: [0, 1],
            outputRange: [windowHeight / 4 + 30, 0],
        });

        const animSearchBar = {
            transform: [
                {
                    translateY: yVal,
                },
            ],
            borderBottomWidth: !firstSearch ? StyleSheet.hairlineWidth : 0,
        };

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
                    <BrowserSearchBar
                        value={firstSearch ? '' : currentUrl}
                        onPressHome={this.navigateHome}
                        onPressRefresh={this.reloadPage}
                        animations={this.searchBarAnimations()}
                        shouldAnimate={true}
                        containerStyle={animSearchBar}
                        onSubmitTextInput={this.onSubmitTextInput}
                        shouldSelect={!firstSearch}
                        onAnimationFinished={this.onSearchBarAnimationFinished}
                    />
                    {!firstSearch &&
                    <BrowserWebView
                        ref={this.webviewRef}
                        onNavigationStateChange={this.onNavigationStateChange}
                        onMessage={this.onMessage}
                        onShouldStartLoadWithRequest={this.onShouldStartLoadWithRequest}
                        source={{uri: url}}
                    />
                    }
                    {!firstSearch && isCasting &&
                    <CasterControl/>
                    }
                    {!firstSearch &&
                    <NavigationBar
                        canGoBack={canGoBack}
                        canGoForward={canGoForward}
                        onBackPress={this.backButtonHandler}
                        onForwardPress={this.frontButtonHandler}
                    />
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
});

export default Browser;
