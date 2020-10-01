import React, {Component} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faAngleLeft, faAngleRight} from '@fortawesome/free-solid-svg-icons';
import {CastButton} from 'react-native-google-cast';
import PropTypes from 'prop-types';

class NavigationBar extends Component {

    static propTypes = {
        canGoBack: PropTypes.bool.isRequired,
        canGoForward: PropTypes.bool.isRequired,
        onBackPress: PropTypes.func.isRequired,
        onForwardPress: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
    }

    render() {
        const {canGoBack, canGoForward, onBackPress, onForwardPress} = this.props;
        return (
            <View style={styles.navigationBar}>
                <TouchableOpacity style={styles.navigationButton} disabled={!canGoBack}
                                  onPress={onBackPress}>
                    <FontAwesomeIcon color={canGoBack ? '#646464' : '#cdcdcd'} size={28} icon={faAngleLeft}/>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navigationButton} disabled={!canGoForward}
                                  onPress={onForwardPress}>
                    <FontAwesomeIcon color={canGoForward ? '#646464' : '#cdcdcd'} size={28}
                                     icon={faAngleRight}/>
                </TouchableOpacity>
                <CastButton style={styles.castButton}/>
            </View>
        );
    }
}

const styles = StyleSheet.create({
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
});

export default NavigationBar;
