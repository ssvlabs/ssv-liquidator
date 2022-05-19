import * as React from 'react';
import { Box, Text } from 'ink';

interface IActionBarProps {
  actions?: any;
  onActionPerformed;
  stdin;
}

interface IActionBarState {
  waitingForConfirmation;
}

export class ActionBarComponent extends React.Component<
  IActionBarProps,
  IActionBarState
> {
  private keyPressListeners;

  constructor(props) {
    super(props);
    this.keyPressListeners = [];
    this.state = { waitingForConfirmation: false };
  }

  getAvailableActions() {
    let availableActions = '';

    this.props.actions.forEach(action => {
      availableActions += `[${action.key.toUpperCase()}]: ${
        action.description
      } `;
    });

    return availableActions;
  }

  createKeyPressListener(action) {
    return (chunk, key) => {
      if (key.name == action.key && action.needsConfirmation) {
        this.setState({
          ...this.state,
          waitingForConfirmation: {
            key,
          },
        });
      } else if (key.name == action.key && !this.state.waitingForConfirmation) {
        this.props.onActionPerformed(key);
      } else if (this.state.waitingForConfirmation) {
        if (key.name == 'y') {
          this.props.onActionPerformed(this.state.waitingForConfirmation.key);
          this.setState({
            ...this.state,
            waitingForConfirmation: false,
          });
        } else if (key.name == 'n') {
          this.setState({
            ...this.state,
            waitingForConfirmation: false,
          });
        }
      }
    };
  }

  componentDidMount() {
    this.props.actions.forEach(action => {
      const keyPressListener = this.createKeyPressListener(action);
      this.keyPressListeners.push(keyPressListener);
      this.props.stdin.on('keypress', keyPressListener);
    });
  }

  componentWillUnmount() {
    // Remove all listeners added by this component
    this.keyPressListeners.forEach(keyPressListener => {
      this.props.stdin.removeListener('keypress', keyPressListener);
    });
  }

  render() {
    if (this.props.actions.length > 0) {
      return (
        <Box marginTop={1} marginBottom={1}>
          <Text color="yellow">
            {this.state.waitingForConfirmation
              ? 'Are you sure [Y/N]:'
              : this.getAvailableActions()}
          </Text>
        </Box>
      );
    } else {
      return '';
    }
  }
}

module.exports = {
  ActionBarComponent,
};
