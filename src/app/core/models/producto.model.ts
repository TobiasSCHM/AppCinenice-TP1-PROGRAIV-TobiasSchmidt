export interface CategoriaProducto {
  id: number;
  nombre: string;
}

// un producto del candy bar. categoria viene de la relacion con categorias_producto
export interface Producto {
  id: number;
  categoria_id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagen_url: string | null;
  activo: boolean;
  categoria: { nombre: string } | null;
}

// lo que edita el admin en el formulario. la categoria y la imagen se manejan aparte
export interface ProductoDraft {
  nombre: string;
  descripcion: string;
  precio: number | null;
  activo: boolean;
}