import React, { Component } from 'react';
import importJsx from 'import-jsx';
import path from 'path';
import { Text } from 'ink';

import { transformClusterData } from './cluster.transformer';
const { ClustersComponent } = importJsx(
  path.join(__dirname, '/../../clusters/cli/cluster.component'),
);
interface IClustersProps {
  service;
  web3Provider;
}

interface IClustersState {
  items?: any;
  err?: string;
}

export class Clusters extends Component<IClustersProps, IClustersState> {
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

  async componentWillUnmount() {
    this.willComponentUnmount = true;
    clearInterval(this.timer);
  }

  async listenForChanges() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(async () => {
      if (this.willComponentUnmount) return;
      const currentBlockNumber =
        await this.props.web3Provider.currentBlockNumber();
      const items = await this.props.service.toDisplay();
      this.setStateSafely({
        items: transformClusterData(items, {
          currentBlockNumber,
        }),
      });
    }, 1000);
  }

  render() {
    if (!this.state.err) {
      return <ClustersComponent items={this.state.items} />;
    } else {
      return <Text color="red">{this.state.err}</Text>;
    }
  }
}
