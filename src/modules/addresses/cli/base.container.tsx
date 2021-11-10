import React, { Component } from 'react';
import { Text } from 'ink';

interface IBaseProps {
  cellSpacing?: number;
  componentRef;
  service;
  transformer;
}

interface IBaseState {
  items?: any;
  err?: string;
}

export class BaseContainer extends Component<IBaseProps, IBaseState> {
  private timer;
  private willComponentUnmount: boolean;

  constructor(props) {
    super(props);
    this.state = { items: [], err: '' };
    this.timer;
    this.willComponentUnmount = false;
  }

  setStateSafely(state) {
    if (!this.willComponentUnmount) {
      this.setState(state);
    }
  }

  async componentDidMount() {
    await this.listenForChanges();
  }

  componentDidUpdate() {}

  componentWillUnmount() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.willComponentUnmount = true;
  }

  async listenForChanges() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(async() => {
      const items = await this.props.service.findAll();
      const currentBlockNumber = await this.props.service.currentBlockNumber();
      this.setStateSafely({
        items: this.props.transformer(items, { currentBlockNumber })
      });
    }, 1000);
  }

  render() {
    if (!this.state.err) {
      return (
        <this.props.componentRef items={this.state.items}/>
      );
    } else {
      return (
        <Text color="red">
          {this.state.err}
        </Text>
      );
    }
  }
}
