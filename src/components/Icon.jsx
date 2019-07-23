import PropTypes from 'prop-types';

function IconComponent({dictIcons, iconName, height, svgStyles}) {
  if (Object.prototype.hasOwnProperty.call(dictIcons, iconName)) {
		return dictIcons[iconName](height, svgStyles);
	}
  console.log(iconName, ' is missing');
  console.log(dictIcons[iconName], ' is the access');
  console.log(dictIcons, 'that was all them');
	return dictIcons['data-explore'](height, svgStyles);
};

IconComponent.propTypes = {
  iconName: PropTypes.string.isRequired,
  dictIcons: PropTypes.object.isRequired,
  height: PropTypes.string,
  svgStyles: PropTypes.object,
};

IconComponent.defaultProps = {
  height: '27px',
  svgStyles: {},
};

export default IconComponent;
