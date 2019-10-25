import React from 'react';
import { Link } from 'react-router-dom';
import Button from '@gen3/ui-component/dist/components/Button';

function LoginMsg() {
  const MSG = 'Only shows partial data because you are currently not logged in. Please log in to explore more datasets.';
  return (
    <div className='explorer-visualization__login'>
      <Link to='/login'>
        <Button
          className='explorer-visualization__login-btn'
          label='See more data'
          buttonType='default'
        />
      </Link>
      <span className='explorer-visualization__login-msg'>{MSG}</span>
    </div>
  );
}

export default LoginMsg;
