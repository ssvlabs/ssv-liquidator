import * as React from 'react';
import { Tab, Tabs } from 'ink-tab';

export const NamespacesComponent = ({ namespaces, onNamespaceChange }) => {
  return (
    <Tabs
      onChange={name => onNamespaceChange(name)}
      keyMap={{ useNumbers: true, useTab: true }}
      // @ts-ignore - isRawModeSupported fixes ink-tab warning but not in types
      isRawModeSupported={!!(process.stdin && process.stdin.isTTY)}
    >
      {namespaces.map(namespace => (
        <Tab key={namespace} name={namespace}>
          {namespace}
        </Tab>
      ))}
    </Tabs>
  );
};

module.exports = {
  NamespacesComponent,
};
