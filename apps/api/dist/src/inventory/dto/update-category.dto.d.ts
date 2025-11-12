export declare class UpdateCategoryDto {
    name?: string;
    slug?: string;
    description?: string;
    parentId?: string;
    image?: string;
    order?: number;
    status?: 'active' | 'inactive';
}
