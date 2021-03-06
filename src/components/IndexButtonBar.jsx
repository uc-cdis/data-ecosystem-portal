import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Button from '@gen3/ui-component/dist/components/Button';
import IconComponent from './Icon';
import './IndexButtonBar.css';

/**
 * NavBar renders row of nav-items of form { name, icon, link }
 * @param {dictIcons, buttons} params
 */
class IndexButtonBar extends Component {
  render() {
    const settings = {
      dots: true,
      infinite: false,
      speed: 500,
      slidesToShow: 4,
      slidesToScroll: 1,
      arrows: true,
    };
    const isSupported = item => (!item.coming_soon);
    const supportedCount = this.props.buttons.filter(item => isSupported(item)).length;
    return (
      <React.Fragment>
        <div className='index-button-bar__header'>
          {supportedCount} Supported Data Resources
        </div>
        <div className='index-button-bar'>
          {
            <Slider {...settings}>{
              this.props.buttons.map(
                item => (
                  <div key={item.name} className='index-button-bar__thumbnail-button-wrapper'>
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
                      <div
                        className='body-typo index-button-bar__thumbnail-text'
                        dangerouslySetInnerHTML={{ __html: item.body }}
                      />
                      <div className='index-button-bar__button-group'>
                        {
                          Object.prototype.hasOwnProperty.call(item, 'external_link') &&
                          <a href={item.external_link} target='_blank' rel='noopener noreferrer'>
                            <Button
                              label={Object.prototype.hasOwnProperty.call(item, 'external_link_text') ? item.external_link_text : 'Visit Website'}
                              buttonType={isSupported(item) ? 'primary' : 'default'}
                            />
                          </a>
                        }
                      </div>
                    </div>
                  </div>
                ),
              )
            }</Slider>
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
