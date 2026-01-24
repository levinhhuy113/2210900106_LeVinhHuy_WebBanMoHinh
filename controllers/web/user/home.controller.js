const Product = require('../../../models/product.model');
const Category = require('../../../models/category.model');
const { success, error } = require('../../../helpers/response');

class HomeController {
    async overview(req, res) {
        try {
            const categoryBlocks = await Category.aggregate([
                // chỉ lấy category đang active (nếu có field)
                { $match: { isActive: true } },

                // random 4 danh mục
                // { $sample: { size: 4 } },

                {
                    $lookup: {
                        from: 'products',
                        let: {
                            categoryId: '$_id',
                            categoryName: '$name'
                        },
                        pipeline: [
                            // product active + đúng category
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$categoryId', '$$categoryId'] },
                                            { $eq: ['$isActive', true] }
                                        ]
                                    }
                                }
                            },

                            {
                                $lookup: {
                                    from: 'brands',
                                    localField: 'brandId',
                                    foreignField: '_id',
                                    as: 'brand'
                                }
                            },

                            {
                                $addFields: {
                                    brandName: {
                                        $ifNull: [{ $arrayElemAt: ['$brand.name', 0] }, '']
                                    }
                                }
                            },


                            // lookup tồn kho
                            {
                                $lookup: {
                                    from: 'stockEntries',
                                    localField: '_id',
                                    foreignField: 'productId',
                                    as: 'stockEntries'
                                }
                            },

                            // kiểm tra có tồn kho
                            {
                                $addFields: {
                                    hasStock: {
                                        $cond: [
                                            { $gt: [{ $size: '$variantCombinations' }, 0] },

                                            // ====== CÓ BIẾN THỂ ======
                                            {
                                                $gt: [
                                                    {
                                                        $size: {
                                                            $filter: {
                                                                input: '$stockEntries',
                                                                as: 'se',
                                                                cond: {
                                                                    $and: [
                                                                        { $eq: ['$$se.status', 'imported'] },
                                                                        { $gt: ['$$se.remainingQuantity', 0] },
                                                                        { $ne: ['$$se.variantCombinationId', null] }
                                                                    ]
                                                                }
                                                            }
                                                        }
                                                    },
                                                    0
                                                ]
                                            },

                                            // ====== KHÔNG CÓ BIẾN THỂ ======
                                            {
                                                $gt: [
                                                    {
                                                        $size: {
                                                            $filter: {
                                                                input: '$stockEntries',
                                                                as: 'se',
                                                                cond: {
                                                                    $and: [
                                                                        { $eq: ['$$se.status', 'imported'] },
                                                                        { $gt: ['$$se.remainingQuantity', 0] },
                                                                        // { $eq: ['$$se.variantCombinationId', null] }
                                                                    ]
                                                                }
                                                            }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        ]
                                    }
                                }
                            },

                            // chỉ giữ sản phẩm có hàng
                            { $match: { hasStock: true } },

                            // xử lý ảnh
                            {
                                $addFields: {
                                    images: {
                                        $cond: [
                                            { $eq: ['$hasVariants', true] },
                                            {
                                                $reduce: {
                                                    input: '$variantCombinations',
                                                    initialValue: [],
                                                    in: {
                                                        $concatArrays: [
                                                            '$$value',
                                                            { $ifNull: ['$$this.images', []] }
                                                        ]
                                                    }
                                                }
                                            },
                                            '$images'
                                        ]
                                    },
                                    categoryName: '$$categoryName'
                                }
                            },

                            {
                                $addFields: {
                                    price: {
                                        $cond: [
                                            { $eq: ['$hasVariants', true] },

                                            // ===== CÓ BIẾN THỂ → lấy giá thấp nhất =====
                                            {
                                                $min: {
                                                    $map: {
                                                        input: '$variantCombinations',
                                                        as: 'vc',
                                                        in: '$$vc.price'
                                                    }
                                                }
                                            },

                                            // ===== KHÔNG CÓ BIẾN THỂ =====
                                            '$price'
                                        ]
                                    }
                                }
                            },

                            // random 8 sản phẩm trong category
                            { $sample: { size: 8 } },

                            // loại field thừa
                            {
                                $project: {
                                    brand: 0,
                                    stockEntries: 0,
                                    hasStock: 0,
                                    variantCombinations: 0
                                }
                            }
                        ],
                        as: 'products'
                    }
                },

                // chỉ giữ category có ít nhất 1 sản phẩm
                {
                    $match: {
                        'products.0': { $exists: true }
                    }
                },

                { $sample: { size: 4 } },

                // format output gọn
                {
                    $project: {
                        _id: 1,
                        categoryName: '$name',
                        products: 1
                    }
                }
            ]);

            res.render('user/home', {
                title: 'Trang chủ',
                categoryBlocks: categoryBlocks
            });

        } catch (err) {
            console.error(err);
            res.status(500).render('user/home', {
                title: 'Trang chủ',
                newProducts: [],
                errorMsg: 'Có lỗi xảy ra khi tải danh sách sản phẩm.'
            });
        }
    }
}

module.exports = new HomeController();
