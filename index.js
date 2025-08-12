const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// === Configuración de MULTER para subir imágenes ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const nombreArchivo = ${Date.now()}${ext};
    cb(null, nombreArchivo);
  }
});
const upload = multer({ storage });

// === Productos ===
const archivoProductos = path.join(__dirname, 'productos.json');
let productos = [];
let idCounter = 1;

function cargarProductos() {
  if (fs.existsSync(archivoProductos)) {
    const data = fs.readFileSync(archivoProductos, 'utf-8');
    productos = JSON.parse(data);
    idCounter = productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1;
  } else {
    productos = [];
  }
}
function guardarProductos() {
  fs.writeFileSync(archivoProductos, JSON.stringify(productos, null, 2), 'utf-8');
}
cargarProductos();

// Servir imágenes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// === Rutas de productos ===
app.get('/api/productos', (req, res) => {
  res.json(productos);
});

app.get('/api/productos/buscar', (req, res) => {
  const { q } = req.query;
  if (!q || q.trim() === '') {
    return res.status(400).json({ message: 'Término de búsqueda requerido' });
  }

  const resultado = productos.filter(p =>
    p.nombre.toLowerCase().includes(q.toLowerCase())
  );

  res.json(resultado);
});

app.get('/api/productos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const producto = productos.find(p => p.id === id);
  if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
  res.json(producto);
});

app.post('/api/productos', upload.array('imagenes', 5), (req, res) => {
  const { nombre, descripcion, precio, stock, sexo, categoria, color, portadaIndex } = req.body;

  if (!nombre || !descripcion || !precio || !stock || !sexo || !categoria || !color || req.files.length === 0) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios (incluidas imágenes)' });
  }

  const imagenes = req.files.map(file => /uploads/${file.filename});
  const indexPortada = parseInt(portadaIndex);

  if (isNaN(indexPortada) || indexPortada < 0 || indexPortada >= imagenes.length) {
    return res.status(400).json({ message: 'Índice de portada inválido' });
  }

  const nuevoProducto = {
    id: idCounter++,
    nombre,
    title: nombre,
    descripcion,
    precio: parseFloat(precio),
    stock: parseInt(stock),
    sexo: sexo.toLowerCase(),
    categoria: categoria.toLowerCase(),
    color: color.toLowerCase(),
    imagenes,
    portada: imagenes[indexPortada]
  };

  productos.push(nuevoProducto);
  guardarProductos();

  res.status(201).json(nuevoProducto);
});

app.put('/api/productos/:id', upload.array('imagenes', 5), (req, res) => {
  const id = parseInt(req.params.id);
  const producto = productos.find(p => p.id === id);
  if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });

  const { nombre, descripcion, precio, stock, sexo, categoria, color, portadaIndex } = req.body;

  producto.nombre = nombre || producto.nombre;
  producto.title = nombre || producto.title;
  producto.descripcion = descripcion || producto.descripcion;
  producto.precio = parseFloat(precio) || producto.precio;
  producto.stock = parseInt(stock) || producto.stock;
  producto.sexo = sexo ? sexo.toLowerCase() : producto.sexo;
  producto.categoria = categoria ? categoria.toLowerCase() : producto.categoria;
  producto.color = color ? color.toLowerCase() : producto.color;

  if (req.files && req.files.length > 0) {
    const nuevasImagenes = req.files.map(file => /uploads/${file.filename});
    producto.imagenes = nuevasImagenes;

    const indexPortada = parseInt(portadaIndex);
    producto.portada = (!isNaN(indexPortada) && indexPortada >= 0 && indexPortada < nuevasImagenes.length)
      ? nuevasImagenes[indexPortada]
      : nuevasImagenes[0];
  }

  guardarProductos();
  res.json(producto);
});

app.delete('/api/productos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = productos.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ message: 'Producto no encontrado' });

  productos.splice(index, 1);
  guardarProductos();

  res.json({ message: 'Producto eliminado correctamente' });
});


// === Usuarios ===
const archivoUsuarios = path.join(__dirname, 'usuarios.json');
let usuarios = [];

function cargarUsuarios() {
  if (fs.existsSync(archivoUsuarios)) {
    const data = fs.readFileSync(archivoUsuarios, 'utf-8');
    usuarios = JSON.parse(data);
  } else {
    usuarios = [];
  }
}
function guardarUsuarios() {
  fs.writeFileSync(archivoUsuarios, JSON.stringify(usuarios, null, 2), 'utf-8');
}
cargarUsuarios();

app.post('/api/register', (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  if (nombre.trim().length < 2) {
    return res.status(400).json({ message: 'El nombre debe tener al menos 2 caracteres' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'El correo electrónico no es válido' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const existe = usuarios.find(u => u.email === email);
  if (existe) {
    return res.status(409).json({ message: 'El correo ya está registrado' });
  }

  const nuevoUsuario = {
    id: Date.now(),
    nombre,
    email,
    password
  };

  usuarios.push(nuevoUsuario);
  guardarUsuarios();

  res.status(201).json({ message: 'Usuario registrado correctamente' });
});


// === Iniciar servidor ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(🚀 Backend corriendo en http://localhost:${PORT});
});
