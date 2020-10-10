import React, {Component} from 'react';
import {Animated, StyleSheet, TextInput, TouchableOpacity, View} from 'react-native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faHome, faRedo, faSearch} from '@fortawesome/free-solid-svg-icons';
import UrlService from '../Services/UrlService';
import PropTypes from 'prop-types';

class BrowserSearchBar extends Component {

    static propTypes = {
        shouldAnimate: PropTypes.bool,
        shouldSelect: PropTypes.bool,
        value: PropTypes.string.isRequired,
        onPressRefresh: PropTypes.func.isRequired,
        onPressHome: PropTypes.func.isRequired,
        onSubmitTextInput: PropTypes.func,
        containerStyle: PropTypes.object,
        onSelectionChange: PropTypes.func,
    };

    constructor(props) {
        super(props);

        this.state = {
            value: this.props.value,
            searchBarText: '',
            selectionStart: undefined,
            selectionEnd: undefined,
            shouldSelectNow: false,
        };

        this.padding = new Animated.Value(0);
    }

    static getDerivedStateFromProps(props, state) {
        if (props.value !== state.value) {
            const searchBarText = UrlService.parseUrl(props.value);
            return {
                value: props.value,
                searchBarText
            };
        }
        return null;
    }

    onFocusTextInput = () => {
        const {value, shouldAnimate} = this.props;

        this.setState({
            searchBarText: value,
            selectionStart: 0,
            selectionEnd: value.length,
            shouldSelectNow: true,
        });

        if (shouldAnimate) {
            Animated.timing(this.padding, {
                toValue: 0,
                duration: 100,
                useNativeDriver: false,
            }).start();
        }
    };

    onBlurTextInput = () => {
        const {value, shouldAnimate} = this.props;

        const searchBarText = UrlService.parseUrl(value);
        this.setState({
            searchBarText,
            selectionStart: undefined,
            selectionEnd: undefined,
            shouldSelectNow: false,
        });

        if (shouldAnimate) {
            Animated.timing(this.padding, {
                toValue: 1,
                duration: 100,
                useNativeDriver: false,
            }).start();
        }
    };

    onSelectionChangeTextInput = ({nativeEvent: {selection: {start, end}}}) => {
        const {onSelectionChange} = this.props;
        this.setState({
            selectionStart: start,
            selectionEnd: end,
            shouldSelectNow: true,
        });
        onSelectionChange && onSelectionChange(nativeEvent);
    };

    onSubmitTextInput = () => {
        const {onSubmitTextInput} = this.props;
        const {searchBarText} = this.state;

        const newUrl = this.parseSearchBarText(searchBarText);
        onSubmitTextInput && onSubmitTextInput(newUrl);
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

    onPressHome = () => {
        const {onPressHome} = this.props;
        onPressHome && onPressHome();
    };

    onPressRefresh = () => {
        const {onPressRefresh} = this.props;
        onPressRefresh && onPressRefresh();
    };

    searchBarTextChanged = (text) => {
        this.setState({
            searchBarText: text,
            shouldSelectNow: false,
        });
    };

    render() {
        const {
            searchBarText,
            selectionStart,
            selectionEnd,
            shouldSelectNow,
        } = this.state;

        const {
            shouldSelect,
            containerStyle,
        } = this.props;

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

        const selection = shouldSelect && shouldSelectNow ? {
            start: selectionStart,
            end: selectionEnd,
        } : undefined;

        return (
            <Animated.View style={[styles.searchBar, containerStyle]}>
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
        );
    }
}

const styles = StyleSheet.create({
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

export default BrowserSearchBar;
