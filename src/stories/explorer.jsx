import React from 'react';
import { storiesOf } from '@storybook/react';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faAngleDown, faAngleUp } from '@fortawesome/free-solid-svg-icons';
import DataExplorer from '../DataExplorer/.';

import config from './explorerConfig';

storiesOf('Data Explorer', module)
  .add('Data Explorer', () => {
    library.add(faAngleDown, faAngleUp);
    return (
      <DataExplorer />
    );
  });
