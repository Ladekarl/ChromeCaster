import React, {Component} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {WebView} from 'react-native-webview';
import UrlService from '../Services/UrlService';
import LoadingBar from './LoadingBar';
import PropTypes from 'prop-types';

class BrowserWebView extends Component {
    alreadyAskedUrls = [];

    static propTypes = {
        onNavigationStateChange: PropTypes.func.isRequired,
        onMessage: PropTypes.func.isRequired,
        onShouldStartLoadWithRequest: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            loadingPercent: 0,
            loadingColor: '#0065ff',
        };
    }

    componentWillUnmount(): void {
        clearTimeout(this.loadingTimer);
    }

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

    onNavigationStateChange = (navState) => {
        const {onNavigationStateChange} = this.props;
        const {url} = navState;

        const requestDomainName = UrlService.extractDomainName(url);
        UrlService.addToWhitelist(requestDomainName);
        this.alreadyAskedUrls = [];

        onNavigationStateChange && onNavigationStateChange(navState);
    };

    onMessage = event => {
        const {onMessage} = this.props;
        const res = JSON.parse(event.nativeEvent.data);
        const {src} = res.message;
        const alreadyAsked = this.alreadyAskedUrls.indexOf(src) > -1;

        if (!alreadyAsked) {
            onMessage && onMessage(event);
            this.alreadyAskedUrls.push(src);
        }
    };

    onShouldStartLoadWithRequest = (request) => {
        const {onShouldStartLoadWithRequest, source} = this.props;
        console.log('REQUEST:');
        console.log(request);

        if (!request || !request.url) {
            return true;
        }

        const requestUrl = request.url;
        const requestDomainName = UrlService.extractDomainName(requestUrl);

        if (UrlService.isWhitelistedUrl(requestDomainName)) {
            return true;
        }

        const urlDomainName = UrlService.extractDomainName(source.uri);
        if (requestDomainName === urlDomainName) {
            return true;
        }

        if (UrlService.isBlacklistedUrl(requestUrl)) {
            return false;
        }

        return onShouldStartLoadWithRequest && onShouldStartLoadWithRequest(request);
    };

    onLoadProgress = (e) => {
        this.setState({loadingPercent: e.nativeEvent.progress});
    };

    onError = () => {
        this.setState({loadingColor: '#ed4337', percent: 1});
    };

    onLoadStart = () => {
        this.setState({loading: true, loadingColor: '#0065ff'});
    };

    onLoadEnd = () => {
        this.loadingTimer = setTimeout(() => {
            this.setState({loading: false});
        }, 300);
    };

    render() {
        const {forwardedRef} = this.props;
        const {
            loading,
            loadingPercent,
            loadingColor,
        } = this.state;

        return (
            <View style={styles.webViewContainer}>
                {loading && <LoadingBar height={2} color={loadingColor} percent={loadingPercent}/>}
                <WebView
                    {...this.props}
                    ref={forwardedRef}
                    allowsBackForwardNavigationGestures={true}
                    onNavigationStateChange={this.onNavigationStateChange}
                    allowsInlineMediaPlayback={true}
                    javaScriptEnabled={true}
                    onShouldStartLoadWithRequest={this.onShouldStartLoadWithRequest}
                    domStorageEnabled={true}
                    sharedCookiesEnabled={true}
                    cacheEnabled={true}
                    pullToRefreshEnabled={true}
                    startInLoadingState={false}
                    renderLoading={() => {
                    }}
                    allowFileAccess={true}
                    decelerationRate={50}
                    allowFileAccessFromFileURLs={true}
                    allowUniversalAccessFromFileURLs={true}
                    thirdPartyCookiesEnabled={true}
                    scrollEnabled={true}
                    renderError={(url) => Alert.alert('Error', 'Cannot go to that page')}
                    onError={this.onError}
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
                    onLoadStart={this.onLoadStart}
                    onLoadEnd={this.onLoadEnd}
                    onLoadProgress={this.onLoadProgress}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    webViewContainer: {
        flex: 1,
        position: 'relative',
    },
});

export default React.forwardRef((props, ref) => (
    <BrowserWebView {...props} forwardedRef={ref}/>
));
