import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Button from '@gen3/ui-component/dist/components/Button';
import IconComponent from './Icon';
import IconicLink from './buttons/IconicLink';
import './IndexButtonBar.css';

/**
 * NavBar renders row of nav-items of form { name, icon, link }
 * @param {dictIcons, buttons} params
 */
class IndexButtonBar extends Component {
  render() {
    return (
      <React.Fragment>
        <div className='index-button-bar__header'>
          {this.props.buttons.length} Supported Data Resources
        </div>
        <div className='index-button-bar'>
          {
            this.props.buttons.map(
              item => (
                <div className='index-button-bar__thumbnail-button' key={item.name}>
                  <div className='h3-typo index-button-bar__thumbnail-title'>{item.name}</div>
                  <div className='index-button-bar__icon'>
                    { typeof item.icon !== 'undefined' ?
                      <IconComponent
                        dictIcons={this.props.dictIcons}
                        iconName={item.icon}
                        height='90px'
                      /> : <img height='70px' src={item.logo} alt='' /> }
                  </div>
                  <div className='body-typo index-button-bar__thumbnail-text'>{item.body}</div>
                  <div className='index-button-bar__button-group'>
                    { Object.prototype.hasOwnProperty.call(item, 'internal_link') &&
                    <Button
                      className='index-button-bar__item'
                      onClick={() => {
                        this.props.onActiveTab(item.internal_link);
                        this.props.history.push(`${item.internal_link}`);
                      }}
                      label={Object.prototype.hasOwnProperty.call(item, 'internal_link_text') ? item.internal_link_text : 'Explorer Cohorts'}
                      buttonType='secondary'
                    />
                    }
                    { Object.prototype.hasOwnProperty.call(item, 'external_link') &&
                    <IconicLink
                      link={item.external_link}
                      className='index-button-bar__item'
                      caption='Visit Environment'
                      target='_blank'
                      isExternal
                    />
                    }
                  </div>
                </div>
              ),
            )
          }
        </div>
      </React.Fragment>
    );
  }
}

IndexButtonBar.propTypes = {
  dictIcons: PropTypes.object.isRequired,
  buttons: PropTypes.array.isRequired,
  onActiveTab: PropTypes.func,
  history: PropTypes.object.isRequired,
};

IndexButtonBar.defaultProps = {
  onActiveTab: () => {},
};

export default IndexButtonBar;
