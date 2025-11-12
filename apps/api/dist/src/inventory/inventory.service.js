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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const product_schema_1 = require("./schemas/product.schema");
const category_schema_1 = require("./schemas/category.schema");
const stock_adjustment_schema_1 = require("./schemas/stock-adjustment.schema");
const stock_reconciliation_schema_1 = require("./schemas/stock-reconciliation.schema");
let InventoryService = class InventoryService {
    productModel;
    categoryModel;
    adjustmentModel;
    reconciliationModel;
    constructor(productModel, categoryModel, adjustmentModel, reconciliationModel) {
        this.productModel = productModel;
        this.categoryModel = categoryModel;
        this.adjustmentModel = adjustmentModel;
        this.reconciliationModel = reconciliationModel;
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
    async listProducts(shopId, q) {
        const filter = {
            shopId: new mongoose_2.Types.ObjectId(shopId),
        };
        if (q.q) {
            filter.name = { $regex: q.q, $options: 'i' };
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
    async importProducts(shopId, products) {
        const errors = [];
        let imported = 0;
        for (let i = 0; i < products.length; i++) {
            try {
                const dto = products[i];
                if (!dto.name || !dto.price) {
                    errors.push(`Row ${i + 1}: Missing required fields (name, price)`);
                    continue;
                }
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
                await created.save();
                imported++;
            }
            catch (err) {
                errors.push(`Row ${i + 1}: ${err?.message || 'Failed to import'}`);
            }
        }
        return { imported, errors };
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
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __param(1, (0, mongoose_1.InjectModel)(category_schema_1.Category.name)),
    __param(2, (0, mongoose_1.InjectModel)(stock_adjustment_schema_1.StockAdjustment.name)),
    __param(3, (0, mongoose_1.InjectModel)(stock_reconciliation_schema_1.StockReconciliation.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map