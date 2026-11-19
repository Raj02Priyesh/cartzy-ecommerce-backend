const HomePage = require('../../models/homePageModel');

// The home page document is created the first time an admin adds content.
// Until then, these endpoints return empty lists (not 404) so storefronts render normally.

const toCategory = (category) => ({
  name: category.name,
  image: category.image || (category.categoryId ? category.categoryId.image : null),
  categoryId: category.categoryId ? category.categoryId._id : null,
  isActive: category.isActive,
});

// 1. Fetch all active banners with images
exports.getActiveBanners = async (req, res, next) => {
  try {
    const homePage = await HomePage.findOne({});
    const activeBanners = homePage ? homePage.banners.filter(banner => banner.isActive) : [];

    res.status(200).json({
      message: 'Active banners fetched successfully.',
      banners: activeBanners.map(banner => ({
        name: banner.name,
        text: banner.text,
        image: banner.image,
        backgroundImage: banner.backgroundImage,
        buttonText: banner.buttonText,
        buttonLink: banner.buttonLink,
        isActive: banner.isActive,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// 2. Fetch all active categories with images
exports.getActiveCategories = async (req, res, next) => {
  try {
    const homePage = await HomePage.findOne({}).populate('topCategories.categoryId', 'name image');
    const activeCategories = homePage
      ? homePage.topCategories.filter(category => category.isActive && category.categoryId)
      : [];

    res.status(200).json({
      message: 'Active categories fetched successfully.',
      categories: activeCategories.map(toCategory),
    });
  } catch (error) {
    next(error);
  }
};

// 3. Fetch top categories with images
exports.getTopCategories = async (req, res) => {
  try {
    const homePage = await HomePage.findOne().populate('topCategories.categoryId', 'name image');
    const topCategories = homePage ? homePage.topCategories.filter(category => category.categoryId) : [];

    res.status(200).json({ topCategories: topCategories.map(toCategory) });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching top categories', error: error.message });
  }
};

// 4. Fetch best-selling products
exports.getBestSellingProducts = async (req, res, next) => {
  try {
    const homePage = await HomePage.findOne({}).populate({
      path: 'bestSellingProducts',
      model: 'Product',
      select: '-__v',
    });

    res.status(200).json({
      message: 'Best-selling products fetched successfully.',
      products: homePage ? homePage.bestSellingProducts : [],
    });
  } catch (error) {
    next(error);
  }
};
