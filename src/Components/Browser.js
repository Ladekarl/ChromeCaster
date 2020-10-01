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
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faHome, faRedo, faSearch} from '@fortawesome/free-solid-svg-icons';
import GoogleCast from 'react-native-google-cast';
import CasterControl from './CasterControl';
import BlacklistService from '../Services/BlacklistService';
import logoImage from '../../images/logo.png';
import VideoService from '../Services/VideoService';
import BrowserWebView from './BrowserWebView';
import NavigationBar from './NavigationBar';

const logoImageUri = Image.resolveAssetSource(logoImage).uri;

class Browser extends Component {
    webviewRef;

    constructor(props) {
        super(props);
        this.webviewRef = React.createRef();
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
        const {casting, currentUrl, searchBarText} = this.state;
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
                            searchBarText,
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

    searchBarTextChanged = (text) => {
        this.setState({
            searchBarText: text,
            shouldSelect: false,
        });
    };

    navigateUrl = (url) => {
        this.setState({
            url,
        });
    };

    onSubmitTextInput = () => {
        const {firstSearch, searchBarText, url, currentUrl} = this.state;

        if (firstSearch) {
            this.animate();
        }
        const newUrl = this.parseSearchBarText(searchBarText);
        if (newUrl === url || newUrl === currentUrl) {
            this.reloadPage();
        } else {
            this.navigateUrl(newUrl);
        }
    };

    onNavigationStateChange = (navState) => {
        const {canGoBack, canGoForward, url} = navState;
        this.setState({
            canGoBack,
            canGoForward,
            currentUrl: url,
            searchBarText: this.parseUrl(url),
        });
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

    reloadPage = () => {
        if (this.webviewRef && this.webviewRef.current) {
            this.webviewRef.current.reload();
        }
    };

    onPressHome = () => {
        const {currentUrl} = this.state;
        const url = 'https://www.google.com/';
        if (currentUrl === url) {
            this.reloadPage();
        } else {
            this.setState({
                url,
            });
        }
    };

    onPressRefresh = () => {
        this.reloadPage();
    };

    render() {
        const {
            searchBarText,
            url,
            canGoBack,
            canGoForward,
            isCasting,
            firstSearch,
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
                                onSubmitEditing={this.onSubmitTextInput}
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
});

export default Browser;
