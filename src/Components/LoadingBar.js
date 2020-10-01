import React from 'react';
import {StyleSheet, View} from 'react-native';

const LoadingBar = ({color, percent, height}) => {
    const style = {
        backgroundColor: color,
        width: `${percent * 100}%`,
        height,
    };
    return <View style={[styles.container, style]}/>;
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 10,
        top: 0,
        left: 0,
    },
});

export default LoadingBar;
