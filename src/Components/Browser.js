import React, {Component} from 'react';
import {ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View} from 'react-native';
import {WebView} from 'react-native-webview';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faAngleLeft, faAngleRight, faSearch} from '@fortawesome/free-solid-svg-icons';

class Browser extends Component {

    webviewRef;

    constructor(props) {
        super(props);
        this.state = {
            searchBarText: 'google.com',
            url: 'https://google.com',
            canGoBack: false,
            canGoForward: false,
        };
    }

    onMessage = event => {
        console.log('_onMessage', JSON.parse(event.nativeEvent.data));
        const res = JSON.parse(event.nativeEvent.data);
        var videoSrc = res.message;
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
                        var videos = document.querySelectorAll('video');
                        for(var i = 0; i < videos.length; i++) {
                            var video = videos[i];
                            if(video.playing) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({type: "click", message: video.src}));
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
        this.setState({
            url: this.parseSearchBarText(this.state.searchBarText),
        });
    };

    onNavigationStateChange = (navState) => {
        this.setState({
            canGoBack: navState.canGoBack,
            canGoForward: navState.canGoForward,
            searchBarText: this.parseUrl(navState.url),
        });
    };

    setWebviewRef = (ref) => {
        this.webviewRef = ref;
    };

    parseUrl = url => {
        return url
            .replace('http://', '')
            .replace('https://', '')
            .replace('www.', '')
            .replace('wwv.', '')
            .split(/[/?#]/)[0];
    };

    parseSearchBarText = searchBarText => {
        const addedPre = searchBarText.indexOf('://') > -1 ? searchBarText : 'https://' + searchBarText;
        return searchBarText.indexOf('.') > -1 ? addedPre : 'https://www.google.com/search?q=' + searchBarText;
    };

    render() {

        const {
            searchBarText,
            url,
            canGoBack,
            canGoForward,
        } = this.state;

        return (
            <View style={styles.container}>
                <View style={styles.searchBar}>
                    <View style={styles.searchInputContainer}>
                        <FontAwesomeIcon color={'#646464'} icon={faSearch}/>
                        <TextInput
                            multiline={false}
                            textAlign={'center'}
                            onChangeText={this.searchBarTextChanged}
                            style={styles.searchInput}
                            value={searchBarText}
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
                </View>
                <WebView
                    ref={this.setWebviewRef}
                    allowsBackForwardNavigationGestures={true}
                    onNavigationStateChange={this.onNavigationStateChange}
                    style={styles.webview}
                    source={{uri: url}}
                    allowsInlineMediaPlayback={true}
                    javaScriptEnabled={true}
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
                    onMessage={this.onMessage}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <ActivityIndicator
                            color='black'
                            size='large'
                            style={styles.loadingIndicator}
                        />
                    )}
                />
                <View style={styles.navigationBar}>
                    <TouchableOpacity style={styles.navigationButton} disabled={!canGoBack}
                                      onPress={this.backButtonHandler}>
                        <FontAwesomeIcon color={canGoBack ? '#646464' : '#cdcdcd'} size={28} icon={faAngleLeft}/>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navigationButton} disabled={!canGoForward}
                                      onPress={this.frontButtonHandler}>
                        <FontAwesomeIcon color={canGoForward ? '#646464' : '#cdcdcd'} size={28} icon={faAngleRight}/>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchBar: {
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingLeft: '10%',
        paddingRight: '10%',
        paddingTop: 5,
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
        fontSize: 15,
        color: '#222222',
    },
    webview: {
        flex: 1,
    },
    navigationBar: {
        flexDirection: 'row',
        paddingLeft: '25%',
        paddingRight: '25%',
        paddingTop: 5,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#cdcdcd',
    },
    navigationButton: {
        padding: 5,
    },
    loadingIndicator: {
        flex: 1,
    },
});

export default Browser;
