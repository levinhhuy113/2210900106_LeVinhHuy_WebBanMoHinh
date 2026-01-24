const Product = require('../../../models/product.model');
const Category = require('../../../models/category.model');
const Brand = require('../../../models/brand.model');
const StockEntry = require('../../../models/stockEntry.model');
const fs = require('fs');
const path = require('path');
const { success, error } = require('../../../helpers/response');


class ProductsController {
    async overview(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 10;
            const q = req.query.q?.trim() || null;

            let matchStage = {};

            if (q) {
                matchStage.name = { $regex: q, $options: 'i' };
            }

            const totalItems = await Product.countDocuments();
            const totalPages = Math.ceil(totalItems / limit);

            const products = await Product.aggregate([
                { $match: matchStage },

                { $sort: { createdAt: -1 } },
                { $skip: (page - 1) * limit },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'stockEntries',
                        localField: '_id',
                        foreignField: 'productId',
                        as: 'stockData'
                    }
                },

                {
                    $addFields: {
                        totalBatches: { $size: '$stockData' },
                        totalImported: { $sum: '$stockData.quantity' },
                        totalStock: { $sum: '$stockData.remainingQuantity' },
                    }
                },

                {
                    $addFields: {
                        isDelete: { $eq: ['$totalBatches', 0] }
                    }
                },
                {
                    $addFields: {
                        firstVariant: { $arrayElemAt: ['$variantCombinations', 0] }
                    }
                },
                {
                    $addFields: {
                        images: {
                            $cond: [
                                { $gt: [{ $size: '$variantCombinations' }, 0] },
                                '$firstVariant.images',
                                '$images'
                            ]
                        },
                        price: {
                            $cond: [
                                { $gt: [{ $size: '$variantCombinations' }, 0] },
                                '$firstVariant.price',
                                '$price'
                            ]
                        }
                    }
                },

                {
                    $project: {
                        name: 1,
                        price: 1,
                        images: 1,
                        isActive: 1,
                        createdAt: 1,
                        isDelete: 1,
                        variantCombinations: 1,
                        totalBatches: 1,
                        totalImported: 1,
                        totalStock: 1
                    }
                }
            ]);

            const allCategories = await Category.find({}, { name: 1 })
                .sort({ name: 1 })
                .lean();

            const allBrands = await Brand.find({}, { name: 1 })
                .sort({ name: 1 })
                .lean();

            const startIndex = (page - 1) * limit;
            const endIndex = Math.min(startIndex + products.length, totalItems);

            res.render('admin/products', {
                title: 'Quản lý sản phẩm & Kho',
                products,

                allCategories,
                allBrands,
                pagination: {
                    startIndex: startIndex + (totalItems > 0 ? 1 : 0),
                    endIndex,
                    totalItems,
                    currentPage: page,
                    totalPages,
                    hasPrevPage: page > 1,
                    hasNextPage: page < totalPages,
                    prevPage: page - 1,
                    nextPage: page + 1
                },
            });
        } catch (err) {
            console.error(err);
            res.status(500).send('Lỗi Server');
        }
    }


    async detail(req, res) {
        try {
            const { id } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = 5;

            const product = await Product.findById(id)
                .populate('categoryId', 'name')
                .populate('brandId', 'name')
                .lean();

            if (!product) {
                return res.status(404).render('admin/404', { title: 'Không tìm thấy sản phẩm' });
            }

            const totalItems = await StockEntry.countDocuments({ productId: id });
            const totalPages = Math.ceil(totalItems / limit);

            let stockEntries = await StockEntry.find({ productId: id })
                .populate('variantCombinationId', "variantKey")
                .sort({ importDate: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();

            stockEntries = stockEntries.map(se => {
                const variant = product.variantCombinations.find(vc => vc._id === se.variantCombinationId);
                return {
                    ...se,
                    variantKey: variant?.variantKey || null,
                    variantValues: variant?.variants.map(v => v.value).join(' / ') || null
                };
            });

            console.log(stockEntries);

            const startIndex = (page - 1) * limit;
            const endIndex = Math.min(startIndex + stockEntries.length, totalItems);

            product.lockVariantActions = product.variantCombinations?.length > 0;
            product.hasVariantCombinations = Array.isArray(product.variantCombinations) && product.variantCombinations.length > 0;

            if (product.hasVariants && product.variants) {
                // Duyệt qua từng biến thể
                product.variants = product.variants.map(variant => {
                    const updatedOptions = variant.options.map(optionValue => {
                        // Nếu chưa có tổ hợp biến thể, isLocked = false
                        const isLocked = product.variantCombinations?.some(combo =>
                            combo.variants.some(v =>
                                v.variantId.toString() === variant._id.toString() &&
                                v.value.trim().toLowerCase() === optionValue.trim().toLowerCase()
                            )
                        ) || false;

                        return {
                            value: optionValue,
                            isLocked
                        };
                    });

                    return {
                        ...variant,
                        options: updatedOptions
                    };
                });
            }

            res.render('admin/productDetail', {
                title: `Chi tiết sản phẩm`,
                product,
                stockEntries,
                pagination: {
                    startIndex: startIndex + (totalItems > 0 ? 1 : 0),
                    endIndex,
                    totalItems,
                    currentPage: page,
                    totalPages,
                    hasPrevPage: page > 1,
                    hasNextPage: page < totalPages,
                    prevPage: page - 1,
                    nextPage: page + 1
                }
            });
        } catch (err) {
            console.error(err);
            error(res, 500, 'Có lỗi xảy ra khi lấy chi tiết sản phẩm');
        }
    }
}

module.exports = new ProductsController();
