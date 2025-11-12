export declare class CreateCategoryDto {
    name: string;
    slug?: string;
    description?: string;
    parentId?: string;
    image?: string;
    order?: number;
    status?: 'active' | 'inactive';
}
