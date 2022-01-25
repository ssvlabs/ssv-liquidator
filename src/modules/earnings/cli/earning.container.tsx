import React, { Component } from 'react';
import importJsx from 'import-jsx';
import path from 'path';
import { Text } from 'ink';

import { transformEarningData } from './earning.transformer';
const { EarningsComponent } = importJsx(path.join(__dirname,'/../../earnings/cli/earning.component'));

interface IEarningsProps {
  service;
}

interface IEarningsState {
  items?: any;
  err?: string;
}

export class Earnings extends Component<IEarningsProps, IEarningsState> {
  private timer;
  private willComponentUnmount;

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

  async componentWillUnmount() {
    clearInterval(this.timer);
  }

  async listenForChanges() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(async() => {
      const items = await this.props.service.findAll();
      this.setStateSafely({
        items: transformEarningData(items)
      });
    }, 1000);
  }

  render() {
    if (!this.state.err) {
      return (
        <EarningsComponent items={this.state.items}/>
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
