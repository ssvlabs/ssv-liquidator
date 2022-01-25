import * as React from 'react';
import { Tab, Tabs } from 'ink-tab';

export const NamespacesComponent = ({ namespaces, onNamespaceChange }) => {
  return (
    <Tabs
      onChange={(name) => onNamespaceChange(name)}
      keyMap={{ useNumbers: true, useTab: true }}
    >
      {namespaces.map((namespace) => (
        <Tab key={namespace} name={namespace}>
          {namespace}
        </Tab>
      ))}
    </Tabs>
  );
};

module.exports = {
  NamespacesComponent
};