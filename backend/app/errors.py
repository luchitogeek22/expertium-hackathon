"""Errores de dominio con código, mensaje y estado HTTP."""
from __future__ import annotations


class DomainError(Exception):
    def __init__(self, codigo: str, mensaje: str, status: int = 400) -> None:
        super().__init__(mensaje)
        self.codigo = codigo
        self.mensaje = mensaje
        self.status = status


class NotFound(DomainError):
    def __init__(self, codigo: str = "NO_ENCONTRADO",
                 mensaje: str = "Not found") -> None:
        super().__init__(codigo, mensaje, 404)


class Conflict(DomainError):
    def __init__(self, codigo: str = "CONFLICTO",
                 mensaje: str = "State conflict") -> None:
        super().__init__(codigo, mensaje, 409)
