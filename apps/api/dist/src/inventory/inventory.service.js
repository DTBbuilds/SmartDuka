"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var InventoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const product_schema_1 = require("./schemas/product.schema");
const category_schema_1 = require("./schemas/category.schema");
const stock_adjustment_schema_1 = require("./schemas/stock-adjustment.schema");
const stock_reconciliation_schema_1 = require("./schemas/stock-reconciliation.schema");
const category_suggestion_service_1 = require("./services/category-suggestion.service");
let InventoryService = InventoryService_1 = class InventoryService {
    productModel;
    categoryModel;
    adjustmentModel;
    reconciliationModel;
    categorySuggestionService;
    logger = new common_1.Logger(InventoryService_1.name);
    constructor(productModel, categoryModel, adjustmentModel, reconciliationModel, categorySuggestionService) {
        this.productModel = productModel;
        this.categoryModel = categoryModel;
        this.adjustmentModel = adjustmentModel;
        this.reconciliationModel = reconciliationModel;
        this.categorySuggestionService = categorySuggestionService;
    }
    async createProduct(shopId, dto) {
        const created = new this.productModel({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            name: dto.name,
            sku: dto.sku,
            barcode: dto.barcode,
            categoryId: dto.categoryId ? new mongoose_2.Types.ObjectId(dto.categoryId) : undefined,
            price: dto.price,
            cost: dto.cost ?? 0,
            stock: dto.stock ?? 0,
            tax: dto.tax ?? 0,
            status: dto.status ?? 'active',
        });
        return created.save();
    }
    async getProductById(shopId, productId) {
        return this.productModel
            .findOne({
            _id: new mongoose_2.Types.ObjectId(productId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        })
            .exec();
    }
    async updateProduct(shopId, productId, dto) {
        const product = await this.productModel.findOne({
            _id: new mongoose_2.Types.ObjectId(productId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (dto.name !== undefined)
            product.name = dto.name;
        if (dto.sku !== undefined)
            product.sku = dto.sku;
        if (dto.barcode !== undefined)
            product.barcode = dto.barcode;
        if (dto.categoryId !== undefined) {
            product.categoryId = dto.categoryId ? new mongoose_2.Types.ObjectId(dto.categoryId) : undefined;
        }
        if (dto.price !== undefined)
            product.price = dto.price;
        if (dto.cost !== undefined)
            product.cost = dto.cost;
        if (dto.stock !== undefined)
            product.stock = dto.stock;
        if (dto.tax !== undefined)
            product.tax = dto.tax;
        if (dto.status !== undefined)
            product.status = dto.status;
        if (dto.lowStockThreshold !== undefined)
            product.lowStockThreshold = dto.lowStockThreshold;
        if (dto.description !== undefined)
            product.description = dto.description;
        if (dto.image !== undefined)
            product.image = dto.image;
        product.updatedAt = new Date();
        return product.save();
    }
    async deleteProduct(shopId, productId) {
        const product = await this.productModel.findOne({
            _id: new mongoose_2.Types.ObjectId(productId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        await this.productModel.deleteOne({ _id: new mongoose_2.Types.ObjectId(productId) });
        return { deleted: true, message: 'Product deleted successfully' };
    }
    async listProducts(shopId, q) {
        const filter = {
            shopId: new mongoose_2.Types.ObjectId(shopId),
        };
        if (q.q) {
            const searchTerm = q.q.trim();
            const isBarcodeLike = /^\d{8,14}$/.test(searchTerm);
            const isSkuLike = /^[A-Za-z0-9-_]{3,20}$/.test(searchTerm) && !isBarcodeLike;
            if (isBarcodeLike) {
                filter.$or = [
                    { barcode: searchTerm },
                    { sku: { $regex: searchTerm, $options: 'i' } },
                    { name: { $regex: searchTerm, $options: 'i' } },
                ];
            }
            else if (isSkuLike && searchTerm.length <= 20) {
                filter.$or = [
                    { sku: { $regex: `^${searchTerm}`, $options: 'i' } },
                    { barcode: { $regex: searchTerm, $options: 'i' } },
                    { name: { $regex: searchTerm, $options: 'i' } },
                ];
            }
            else {
                filter.$or = [
                    { name: { $regex: searchTerm, $options: 'i' } },
                    { sku: { $regex: searchTerm, $options: 'i' } },
                    { barcode: { $regex: searchTerm, $options: 'i' } },
                    { description: { $regex: searchTerm, $options: 'i' } },
                ];
            }
        }
        if (q.categoryId) {
            filter.categoryId = new mongoose_2.Types.ObjectId(q.categoryId);
        }
        if (q.status) {
            filter.status = q.status;
        }
        return this.productModel
            .find(filter)
            .sort({ updatedAt: -1 })
            .limit(Math.min(q.limit ?? 50, 200))
            .exec();
    }
    async findByBarcode(shopId, barcode) {
        const trimmedBarcode = barcode.trim();
        let product = await this.productModel.findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            barcode: trimmedBarcode,
            status: 'active',
        }).exec();
        if (!product && trimmedBarcode.startsWith('0')) {
            product = await this.productModel.findOne({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                barcode: trimmedBarcode.replace(/^0+/, ''),
                status: 'active',
            }).exec();
        }
        if (!product && trimmedBarcode.length === 12) {
            product = await this.productModel.findOne({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                barcode: '0' + trimmedBarcode,
                status: 'active',
            }).exec();
        }
        return product;
    }
    async findBySku(shopId, sku) {
        return this.productModel.findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            sku: { $regex: `^${sku.trim()}$`, $options: 'i' },
            status: 'active',
        }).exec();
    }
    async quickSearch(shopId, term, limit = 10) {
        const searchTerm = term.trim();
        if (!searchTerm)
            return [];
        const shopObjectId = new mongoose_2.Types.ObjectId(shopId);
        const exactBarcode = await this.productModel.findOne({
            shopId: shopObjectId,
            barcode: searchTerm,
            status: 'active',
        }).exec();
        if (exactBarcode) {
            return [exactBarcode];
        }
        const skuMatches = await this.productModel.find({
            shopId: shopObjectId,
            sku: { $regex: `^${searchTerm}`, $options: 'i' },
            status: 'active',
        }).limit(limit).exec();
        if (skuMatches.length > 0) {
            return skuMatches;
        }
        return this.productModel.find({
            shopId: shopObjectId,
            $or: [
                { name: { $regex: searchTerm, $options: 'i' } },
                { barcode: { $regex: searchTerm, $options: 'i' } },
            ],
            status: 'active',
        }).limit(limit).exec();
    }
    async listCategories(shopId) {
        return this.categoryModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .sort({ order: 1, name: 1 })
            .exec();
    }
    async createCategory(shopId, dto) {
        const slug = dto.slug || dto.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        const existing = await this.categoryModel.findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            slug,
        });
        if (existing) {
            throw new common_1.BadRequestException(`Category with slug "${slug}" already exists`);
        }
        const category = new this.categoryModel({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            name: dto.name,
            slug,
            description: dto.description,
            parentId: dto.parentId ? new mongoose_2.Types.ObjectId(dto.parentId) : undefined,
            image: dto.image,
            order: dto.order ?? 0,
            status: dto.status ?? 'active',
            productCount: 0,
        });
        return category.save();
    }
    async updateCategory(shopId, categoryId, dto) {
        const category = await this.categoryModel.findOne({
            _id: new mongoose_2.Types.ObjectId(categoryId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!category) {
            throw new common_1.BadRequestException('Category not found');
        }
        if (dto.slug && dto.slug !== category.slug) {
            const existing = await this.categoryModel.findOne({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                slug: dto.slug,
                _id: { $ne: new mongoose_2.Types.ObjectId(categoryId) },
            });
            if (existing) {
                throw new common_1.BadRequestException(`Category with slug "${dto.slug}" already exists`);
            }
        }
        if (dto.name)
            category.name = dto.name;
        if (dto.slug)
            category.slug = dto.slug;
        if (dto.description !== undefined)
            category.description = dto.description;
        if (dto.parentId !== undefined) {
            category.parentId = dto.parentId ? new mongoose_2.Types.ObjectId(dto.parentId) : undefined;
        }
        if (dto.image !== undefined)
            category.image = dto.image;
        if (dto.order !== undefined)
            category.order = dto.order;
        if (dto.status)
            category.status = dto.status;
        return category.save();
    }
    async deleteCategory(shopId, categoryId) {
        const category = await this.categoryModel.findOne({
            _id: new mongoose_2.Types.ObjectId(categoryId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!category) {
            throw new common_1.BadRequestException('Category not found');
        }
        const productCount = await this.productModel.countDocuments({
            categoryId: new mongoose_2.Types.ObjectId(categoryId),
        });
        if (productCount > 0) {
            throw new common_1.BadRequestException(`Cannot delete category with ${productCount} product(s). Remove products first or reassign them.`);
        }
        const subCategoryCount = await this.categoryModel.countDocuments({
            parentId: new mongoose_2.Types.ObjectId(categoryId),
        });
        if (subCategoryCount > 0) {
            throw new common_1.BadRequestException(`Cannot delete category with ${subCategoryCount} subcategory(ies). Delete subcategories first.`);
        }
        await this.categoryModel.deleteOne({ _id: new mongoose_2.Types.ObjectId(categoryId) });
    }
    async getCategoryWithProducts(shopId, categoryId) {
        const category = await this.categoryModel.findOne({
            _id: new mongoose_2.Types.ObjectId(categoryId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!category) {
            throw new common_1.BadRequestException('Category not found');
        }
        const products = await this.productModel
            .find({
            categoryId: new mongoose_2.Types.ObjectId(categoryId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        })
            .select('_id name sku price stock status')
            .exec();
        return {
            ...category.toObject(),
            products,
            productCount: products.length,
        };
    }
    async getCategoryHierarchy(shopId) {
        const categories = await this.categoryModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .sort({ order: 1, name: 1 })
            .exec();
        const categoryMap = new Map();
        const rootCategories = [];
        categories.forEach((cat) => {
            categoryMap.set(cat._id.toString(), {
                ...cat.toObject(),
                children: [],
            });
        });
        categories.forEach((cat) => {
            if (cat.parentId) {
                const parent = categoryMap.get(cat.parentId.toString());
                if (parent) {
                    parent.children.push(categoryMap.get(cat._id.toString()));
                }
            }
            else {
                rootCategories.push(categoryMap.get(cat._id.toString()));
            }
        });
        return rootCategories;
    }
    async updateStock(shopId, productId, quantityChange) {
        return this.productModel
            .findOneAndUpdate({ _id: new mongoose_2.Types.ObjectId(productId), shopId: new mongoose_2.Types.ObjectId(shopId) }, { $inc: { stock: quantityChange } }, { new: true })
            .exec();
    }
    async getLowStockProducts(shopId, threshold = 10) {
        return this.productModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            stock: { $lte: threshold },
            status: 'active',
        })
            .sort({ stock: 1 })
            .exec();
    }
    async importProducts(shopId, products, options = {}) {
        const startTime = Date.now();
        const { autoCreateCategories = true, autoSuggestCategories = true, updateExisting = false, skipDuplicates = true, } = options;
        const errors = [];
        let imported = 0;
        let updated = 0;
        let skipped = 0;
        const categoriesCreated = [];
        const categorySuggestions = {};
        const shopObjId = new mongoose_2.Types.ObjectId(shopId);
        const categoryNameToId = new Map();
        const existingCategories = await this.categoryModel.find({ shopId: shopObjId }).lean().exec();
        existingCategories.forEach(cat => {
            categoryNameToId.set(cat.name.toLowerCase(), cat._id);
            if (cat.slug)
                categoryNameToId.set(cat.slug, cat._id);
        });
        const categoryNamesToCreate = new Set();
        for (const product of products) {
            let categoryName = product.category;
            if (!categoryName && !product.categoryId && autoSuggestCategories) {
                const suggested = this.categorySuggestionService.suggestCategory(product.name, product.brand);
                if (suggested) {
                    categoryName = suggested;
                    categorySuggestions[product.name] = suggested;
                }
            }
            if (categoryName && autoCreateCategories) {
                const normalizedName = categoryName.toLowerCase();
                if (!categoryNameToId.has(normalizedName)) {
                    categoryNamesToCreate.add(categoryName);
                }
            }
        }
        if (categoryNamesToCreate.size > 0) {
            const categoriesToInsert = Array.from(categoryNamesToCreate).map(name => ({
                shopId: shopObjId,
                name,
                slug: this.generateSlug(name),
                status: 'active',
                productCount: 0,
            }));
            try {
                const insertedCategories = await this.categoryModel.insertMany(categoriesToInsert, { ordered: false });
                insertedCategories.forEach(cat => {
                    categoryNameToId.set(cat.name.toLowerCase(), cat._id);
                    categoryNameToId.set(cat.slug, cat._id);
                    categoriesCreated.push(cat.name);
                });
                this.logger.log(`Bulk created ${insertedCategories.length} categories`);
            }
            catch (err) {
                if (err.writeErrors) {
                    const successfulInserts = err.insertedDocs || [];
                    successfulInserts.forEach((cat) => {
                        categoryNameToId.set(cat.name.toLowerCase(), cat._id);
                        categoriesCreated.push(cat.name);
                    });
                }
                this.logger.warn(`Some categories failed to create: ${err.message}`);
            }
        }
        const skus = products.map(p => p.sku).filter(Boolean);
        const barcodes = products.map(p => p.barcode).filter(Boolean);
        const existingProductsMap = new Map();
        if (skus.length > 0 || barcodes.length > 0) {
            const existingProducts = await this.productModel.find({
                shopId: shopObjId,
                $or: [
                    ...(skus.length > 0 ? [{ sku: { $in: skus } }] : []),
                    ...(barcodes.length > 0 ? [{ barcode: { $in: barcodes } }] : []),
                ],
            }).lean().exec();
            existingProducts.forEach(p => {
                if (p.sku)
                    existingProductsMap.set(`sku:${p.sku}`, p);
                if (p.barcode)
                    existingProductsMap.set(`barcode:${p.barcode}`, p);
            });
        }
        const productsToInsert = [];
        const updateOperations = [];
        const categoryProductCounts = new Map();
        for (let i = 0; i < products.length; i++) {
            const dto = products[i];
            if (!dto.name || dto.price === undefined || dto.price === null) {
                errors.push(`Row ${i + 1}: Missing required fields (name, price)`);
                continue;
            }
            let categoryId = undefined;
            if (dto.categoryId) {
                try {
                    categoryId = new mongoose_2.Types.ObjectId(dto.categoryId);
                }
                catch {
                    categoryId = categoryNameToId.get(dto.categoryId.toLowerCase());
                }
            }
            else if (dto.category) {
                categoryId = categoryNameToId.get(dto.category.toLowerCase());
            }
            else if (categorySuggestions[dto.name]) {
                categoryId = categoryNameToId.get(categorySuggestions[dto.name].toLowerCase());
            }
            const existingBySku = dto.sku ? existingProductsMap.get(`sku:${dto.sku}`) : null;
            const existingByBarcode = dto.barcode ? existingProductsMap.get(`barcode:${dto.barcode}`) : null;
            const existingProduct = existingBySku || existingByBarcode;
            if (existingProduct) {
                if (updateExisting) {
                    updateOperations.push({
                        updateOne: {
                            filter: { _id: existingProduct._id },
                            update: {
                                $set: {
                                    name: dto.name,
                                    price: dto.price,
                                    cost: dto.cost ?? existingProduct.cost ?? 0,
                                    stock: dto.stock ?? existingProduct.stock ?? 0,
                                    tax: dto.tax ?? existingProduct.tax ?? 0,
                                    categoryId: categoryId ?? existingProduct.categoryId,
                                    status: dto.status ?? existingProduct.status ?? 'active',
                                    description: dto.description ?? existingProduct.description,
                                    brand: dto.brand ?? existingProduct.brand,
                                    lowStockThreshold: dto.lowStockThreshold ?? existingProduct.lowStockThreshold ?? 10,
                                    reorderPoint: dto.reorderPoint ?? existingProduct.reorderPoint ?? 0,
                                    updatedAt: new Date(),
                                },
                            },
                        },
                    });
                    updated++;
                }
                else if (skipDuplicates) {
                    skipped++;
                }
                else {
                    errors.push(`Row ${i + 1}: Product with SKU/barcode already exists`);
                }
                continue;
            }
            productsToInsert.push({
                shopId: shopObjId,
                name: dto.name,
                sku: dto.sku || undefined,
                barcode: dto.barcode || undefined,
                categoryId,
                price: dto.price,
                cost: dto.cost ?? 0,
                stock: dto.stock ?? 0,
                tax: dto.tax ?? 0,
                status: dto.status ?? 'active',
                description: dto.description,
                brand: dto.brand,
                lowStockThreshold: dto.lowStockThreshold ?? 10,
                reorderPoint: dto.reorderPoint ?? 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            if (categoryId) {
                const catIdStr = categoryId.toString();
                categoryProductCounts.set(catIdStr, (categoryProductCounts.get(catIdStr) || 0) + 1);
            }
        }
        if (productsToInsert.length > 0) {
            try {
                const result = await this.productModel.insertMany(productsToInsert, { ordered: false });
                imported = result.length;
            }
            catch (err) {
                if (err.insertedDocs) {
                    imported = err.insertedDocs.length;
                }
                if (err.writeErrors) {
                    err.writeErrors.forEach((writeErr) => {
                        const idx = writeErr.index;
                        errors.push(`Row ${idx + 1}: ${writeErr.errmsg || 'Failed to insert'}`);
                    });
                }
            }
        }
        if (updateOperations.length > 0) {
            try {
                await this.productModel.bulkWrite(updateOperations, { ordered: false });
            }
            catch (err) {
                this.logger.warn(`Some updates failed: ${err.message}`);
            }
        }
        if (categoryProductCounts.size > 0) {
            const categoryUpdateOps = Array.from(categoryProductCounts.entries()).map(([catId, count]) => ({
                updateOne: {
                    filter: { _id: new mongoose_2.Types.ObjectId(catId) },
                    update: { $inc: { productCount: count } },
                },
            }));
            try {
                await this.categoryModel.bulkWrite(categoryUpdateOps, { ordered: false });
            }
            catch (err) {
                this.logger.warn(`Failed to update category counts: ${err.message}`);
            }
        }
        const duration = Date.now() - startTime;
        this.logger.log(`Import complete in ${duration}ms: ${imported} imported, ${updated} updated, ` +
            `${skipped} skipped, ${categoriesCreated.length} categories created`);
        return {
            imported,
            updated,
            skipped,
            errors,
            categoriesCreated,
            categorySuggestions,
        };
    }
    async analyzeImport(shopId, products) {
        const existingCategories = await this.categoryModel.find({
            shopId: new mongoose_2.Types.ObjectId(shopId)
        }).exec();
        const existingCategoryNames = new Set(existingCategories.map(c => c.name.toLowerCase()));
        const analysis = this.categorySuggestionService.analyzeProducts(products);
        const newCategories = [];
        const existingCategoriesUsed = [];
        Object.keys(analysis.suggestedCategories).forEach(category => {
            if (existingCategoryNames.has(category.toLowerCase())) {
                existingCategoriesUsed.push(category);
            }
            else {
                newCategories.push(category);
            }
        });
        let duplicates = 0;
        for (const product of products) {
            if (product.sku || product.barcode) {
                const existing = await this.productModel.findOne({
                    shopId: new mongoose_2.Types.ObjectId(shopId),
                    $or: [
                        ...(product.sku ? [{ sku: product.sku }] : []),
                        ...(product.barcode ? [{ barcode: product.barcode }] : []),
                    ],
                }).exec();
                if (existing)
                    duplicates++;
            }
        }
        return {
            total: analysis.total,
            withCategory: analysis.withCategory,
            withSuggestion: analysis.withSuggestion,
            uncategorized: analysis.uncategorized,
            existingCategories: existingCategoriesUsed,
            newCategories,
            suggestedCategories: analysis.suggestedCategories,
            duplicates,
        };
    }
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
    async exportProducts(shopId, res, categoryId) {
        const filter = { shopId: new mongoose_2.Types.ObjectId(shopId) };
        if (categoryId) {
            filter.categoryId = new mongoose_2.Types.ObjectId(categoryId);
        }
        const products = await this.productModel.find(filter).exec();
        const headers = ['name', 'sku', 'barcode', 'price', 'cost', 'stock', 'categoryId', 'tax', 'status'];
        const rows = products.map((product) => [
            product.name,
            product.sku || '',
            product.barcode || '',
            product.price,
            product.cost || 0,
            product.stock || 0,
            product.categoryId?.toString() || '',
            product.tax || 0,
            product.status || 'active',
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row
                .map((cell) => {
                const str = String(cell);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            })
                .join(',')),
        ].join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
        res.send(csvContent);
    }
    async createStockAdjustment(shopId, productId, quantityChange, reason, adjustedBy, notes) {
        const adjustment = new this.adjustmentModel({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            productId: new mongoose_2.Types.ObjectId(productId),
            quantityChange,
            reason,
            adjustedBy: new mongoose_2.Types.ObjectId(adjustedBy),
            notes,
        });
        await this.productModel.findByIdAndUpdate(productId, { $inc: { stock: quantityChange } }, { new: true });
        return adjustment.save();
    }
    async getStockAdjustmentHistory(shopId, filters) {
        const query = { shopId: new mongoose_2.Types.ObjectId(shopId) };
        if (filters?.productId) {
            query.productId = new mongoose_2.Types.ObjectId(filters.productId);
        }
        if (filters?.reason) {
            query.reason = filters.reason;
        }
        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters.startDate) {
                query.createdAt.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.createdAt.$lte = filters.endDate;
            }
        }
        return this.adjustmentModel.find(query).sort({ createdAt: -1 }).exec();
    }
    async getExpiringProducts(shopId, daysUntilExpiry = 30) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);
        return this.productModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            expiryDate: {
                $lte: expiryDate,
                $gte: new Date(),
            },
            status: 'active',
        })
            .sort({ expiryDate: 1 })
            .exec();
    }
    async createStockReconciliation(shopId, productId, physicalCount, reconciliationDate, reconcililedBy, notes) {
        const product = await this.productModel.findById(productId).exec();
        if (!product) {
            throw new Error('Product not found');
        }
        const systemQuantity = product.stock || 0;
        const variance = physicalCount - systemQuantity;
        const reconciliation = new this.reconciliationModel({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            productId: new mongoose_2.Types.ObjectId(productId),
            systemQuantity,
            physicalCount,
            variance,
            reconciliationDate,
            reconcililedBy: new mongoose_2.Types.ObjectId(reconcililedBy),
            notes,
        });
        if (variance !== 0) {
            await this.createStockAdjustment(shopId, productId, variance, 'correction', reconcililedBy, `Stock reconciliation: ${notes || ''}`);
        }
        return reconciliation.save();
    }
    async getReconciliationHistory(shopId, filters) {
        const query = { shopId: new mongoose_2.Types.ObjectId(shopId) };
        if (filters?.productId) {
            query.productId = new mongoose_2.Types.ObjectId(filters.productId);
        }
        if (filters?.startDate || filters?.endDate) {
            query.reconciliationDate = {};
            if (filters.startDate) {
                query.reconciliationDate.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.reconciliationDate.$lte = filters.endDate;
            }
        }
        return this.reconciliationModel
            .find(query)
            .sort({ reconciliationDate: -1 })
            .exec();
    }
    async getInventoryStats(shopId) {
        const products = await this.productModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .exec();
        const lowStockProducts = products.filter((p) => (p.stock || 0) <= 10).length;
        const expiringDate = new Date();
        expiringDate.setDate(expiringDate.getDate() + 30);
        const expiringProducts = products.filter((p) => p.expiryDate && p.expiryDate <= expiringDate && p.expiryDate >= new Date()).length;
        const totalStockValue = products.reduce((sum, p) => sum + (p.cost || 0) * (p.stock || 0), 0);
        return {
            totalProducts: products.length,
            activeProducts: products.filter((p) => p.status === 'active').length,
            lowStockProducts,
            expiringProducts,
            totalStockValue,
        };
    }
    async getBranchStock(shopId, productId, branchId) {
        const product = await this.productModel.findOne({
            _id: new mongoose_2.Types.ObjectId(productId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!product) {
            return 0;
        }
        if (product.branchInventory && product.branchInventory[branchId]) {
            return product.branchInventory[branchId].stock || 0;
        }
        return product.stock || 0;
    }
    async updateBranchStock(shopId, productId, branchId, quantityChange) {
        const product = await this.productModel.findOne({
            _id: new mongoose_2.Types.ObjectId(productId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!product) {
            throw new common_1.BadRequestException('Product not found');
        }
        if (!product.branchInventory) {
            product.branchInventory = {};
        }
        if (!product.branchInventory[branchId]) {
            product.branchInventory[branchId] = {
                stock: product.stock || 0,
            };
        }
        product.branchInventory[branchId].stock += quantityChange;
        return product.save();
    }
    async getLowStockProductsByBranch(shopId, branchId, threshold = 10) {
        const products = await this.productModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status: 'active',
        })
            .exec();
        return products.filter((p) => {
            const branchStock = p.branchInventory?.[branchId]?.stock ?? p.stock ?? 0;
            return branchStock <= threshold;
        });
    }
    async getBranchInventoryStats(shopId, branchId) {
        const products = await this.productModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .exec();
        let totalStockValue = 0;
        let lowStockCount = 0;
        products.forEach((p) => {
            const branchStock = p.branchInventory?.[branchId]?.stock ?? p.stock ?? 0;
            if (branchStock <= 10) {
                lowStockCount++;
            }
            totalStockValue += (p.cost || 0) * branchStock;
        });
        return {
            totalProducts: products.length,
            activeProducts: products.filter((p) => p.status === 'active').length,
            lowStockProducts: lowStockCount,
            totalStockValue,
        };
    }
    async transferBranchStock(shopId, productId, fromBranchId, toBranchId, quantity, transferredBy) {
        const product = await this.productModel.findOne({
            _id: new mongoose_2.Types.ObjectId(productId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!product) {
            throw new common_1.BadRequestException('Product not found');
        }
        if (!product.branchInventory) {
            product.branchInventory = {};
        }
        if (!product.branchInventory[fromBranchId]) {
            product.branchInventory[fromBranchId] = { stock: product.stock || 0 };
        }
        if (!product.branchInventory[toBranchId]) {
            product.branchInventory[toBranchId] = { stock: 0 };
        }
        const sourceStock = product.branchInventory[fromBranchId].stock || 0;
        if (sourceStock < quantity) {
            throw new common_1.BadRequestException(`Insufficient stock in source branch. Available: ${sourceStock}, Requested: ${quantity}`);
        }
        product.branchInventory[fromBranchId].stock -= quantity;
        product.branchInventory[toBranchId].stock += quantity;
        const updated = await product.save();
        await this.createStockAdjustment(shopId, productId, -quantity, 'transfer', transferredBy, `Transfer from ${fromBranchId} to ${toBranchId}`);
        return updated;
    }
    async getInventoryAnalytics(shopId) {
        const products = await this.productModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .exec();
        const categories = await this.categoryModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .exec();
        const totalProducts = products.length;
        const activeProducts = products.filter(p => p.status === 'active').length;
        const lowStockThreshold = 10;
        const lowStockProducts = products.filter(p => (p.stock || 0) <= lowStockThreshold && (p.stock || 0) > 0).length;
        const outOfStockProducts = products.filter(p => (p.stock || 0) === 0).length;
        const totalStockValue = products.reduce((sum, p) => sum + ((p.cost || p.price || 0) * (p.stock || 0)), 0);
        const totalStockUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
        const averageStockLevel = totalProducts > 0 ? Math.round(totalStockUnits / totalProducts) : 0;
        const lowStockItems = products
            .filter(p => (p.stock || 0) <= lowStockThreshold)
            .sort((a, b) => (a.stock || 0) - (b.stock || 0))
            .slice(0, 10)
            .map(p => ({
            name: p.name,
            stock: p.stock || 0,
            threshold: lowStockThreshold,
            sku: p.sku || '',
        }));
        const categoryMap = new Map();
        products.forEach(p => {
            const catId = p.categoryId?.toString() || 'uncategorized';
            const category = categories.find(c => c._id.toString() === catId);
            const catName = category?.name || 'Uncategorized';
            const existing = categoryMap.get(catId) || { name: catName, count: 0, value: 0 };
            existing.count += 1;
            existing.value += (p.cost || p.price || 0) * (p.stock || 0);
            categoryMap.set(catId, existing);
        });
        const stockByCategory = Array.from(categoryMap.values())
            .sort((a, b) => b.value - a.value)
            .slice(0, 6)
            .map(c => ({ category: c.name, count: c.count, value: Math.round(c.value) }));
        const topMovingProducts = products
            .filter(p => p.status === 'active' && (p.stock || 0) > 0)
            .sort((a, b) => (a.stock || 0) - (b.stock || 0))
            .slice(0, 5)
            .map(p => ({
            name: p.name,
            soldQty: 0,
            currentStock: p.stock || 0,
        }));
        const slowMovingProducts = products
            .filter(p => p.status === 'active' && (p.stock || 0) > 20)
            .sort((a, b) => (b.stock || 0) - (a.stock || 0))
            .slice(0, 5)
            .map(p => ({
            name: p.name,
            soldQty: 0,
            currentStock: p.stock || 0,
            daysSinceLastSale: 30,
        }));
        const recentAdjustments = await this.adjustmentModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .sort({ createdAt: -1 })
            .limit(10)
            .exec();
        const recentStockChanges = recentAdjustments.map(adj => {
            const doc = adj;
            return {
                product: doc.productId?.toString() || 'Unknown',
                change: adj.quantityChange || 0,
                type: (adj.quantityChange || 0) > 0 ? 'in' : (adj.reason === 'correction' ? 'adjustment' : 'out'),
                date: doc.createdAt || new Date(),
            };
        });
        const turnoverRate = 3.2;
        return {
            totalProducts,
            activeProducts,
            lowStockProducts,
            outOfStockProducts,
            totalStockValue: Math.round(totalStockValue),
            totalStockUnits,
            categoriesCount: categories.length,
            averageStockLevel,
            turnoverRate,
            lowStockItems,
            topMovingProducts,
            slowMovingProducts,
            stockByCategory,
            recentStockChanges,
        };
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = InventoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __param(1, (0, mongoose_1.InjectModel)(category_schema_1.Category.name)),
    __param(2, (0, mongoose_1.InjectModel)(stock_adjustment_schema_1.StockAdjustment.name)),
    __param(3, (0, mongoose_1.InjectModel)(stock_reconciliation_schema_1.StockReconciliation.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        category_suggestion_service_1.CategorySuggestionService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map