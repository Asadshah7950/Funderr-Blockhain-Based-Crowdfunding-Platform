import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';

const Button = ({
  mode = 'contained',
  style = {},
  labelStyle = {},
  children,
  ...props
}) => {
  return (
    <PaperButton
      mode={mode}
      style={[styles.button, mode === 'contained' ? styles.containedButton : {}, style]}
      labelStyle={[styles.text, labelStyle]}
      {...props}
    >
      {children}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 5,
    paddingVertical: 3,
  },
  containedButton: {
    backgroundColor: '#4a6da7',
  },
  text: {
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 26,
  },
});

export default Button;
