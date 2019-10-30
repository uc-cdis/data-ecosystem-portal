import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import Button from '@gen3/ui-component/dist/components/Button';
import './Introduction.less';

class Introduction extends Component {
  static propTypes = {
    data: PropTypes.object.isRequired,
  };

  render() {
    return (
      <div className='introduction'>
        <div className='h1-typo introduction__title'>{this.props.data.heading}</div>
        <div className='high-light introduction__text'>{this.props.data.text}</div>
        <Link to='/datasets'>
          <Button
            className='introduction__button'
            buttonType='secondary'
            label='Browse Datasets'
          />
        </Link>
        <Link to='/explorer'>
          <Button
            className='introduction__button'
            buttonType='secondary'
            label='Explore Cohorts'
          />
        </Link>
      </div>
    );
  }
}

export default Introduction;
