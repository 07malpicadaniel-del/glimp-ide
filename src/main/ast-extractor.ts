import * as ts from 'typescript';
import * as fs from 'fs';

export function diseccionarCodigo(filePath: string): { fragmentos: string[], imports: string[] } {
    const code = fs.readFileSync(filePath, 'utf-8');
    
    const sourceFile = ts.createSourceFile(
        filePath,
        code,
        ts.ScriptTarget.Latest,
        true
    );

    const chunks: string[] = [];
    const imports: string[] = [];

    function explorarNodo(nodo: ts.Node) {
        // 1. Capturar Dependencias (Graph RAG)
        if (ts.isImportDeclaration(nodo)) {
            // Extraemos la ruta del import (ej. './vectorDb' o 'react')
            const importPath = (nodo.moduleSpecifier as ts.StringLiteral).text;
            imports.push(importPath);
        }
        // 2. Capturar Bloques Lógicos
        else if (
            ts.isClassDeclaration(nodo) || 
            ts.isFunctionDeclaration(nodo) || 
            ts.isInterfaceDeclaration(nodo)
        ) {
            chunks.push(nodo.getText(sourceFile));
        } else {
            ts.forEachChild(nodo, explorarNodo);
        }
    }

    explorarNodo(sourceFile);
    return { fragmentos: chunks, imports }; // Ahora devolvemos ambas cosas
}