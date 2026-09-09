
import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    brandColor: string;
}

// Utility to convert hex to an RGB object
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
};

// Generates color shades. For dark mode, it produces softer, less contrasted colors.
const generateShades = (hex: string, theme: 'light' | 'dark' = 'light') => {
    const baseRgb = hexToRgb(hex);
    if (!baseRgb) return {};

    const shades: { [key: number]: string } = {};
    const factors = {
        50: 0.95, 100: 0.9, 200: 0.7, 300: 0.5, 400: 0.3,
        500: 0.1, 600: 0, 700: -0.1, 800: -0.2, 900: -0.3, 950: -0.4
    };

    for (const [shade, factor] of Object.entries(factors)) {
        // In dark mode, reduce the amount of whitening for lighter shades to lower contrast
        const effectiveFactor = (theme === 'dark' && factor > 0) ? factor * 0.4 : factor;

        let r, g, b;
        if (factor > 0) { // Lighter shades, mix with white
             r = Math.round(baseRgb.r + (255 - baseRgb.r) * effectiveFactor);
             g = Math.round(baseRgb.g + (255 - baseRgb.g) * effectiveFactor);
             b = Math.round(baseRgb.b + (255 - baseRgb.b) * effectiveFactor);
        } else { // Darker shades, mix with black
             r = Math.round(baseRgb.r + baseRgb.r * effectiveFactor);
             g = Math.round(baseRgb.g + baseRgb.g * effectiveFactor);
             b = Math.round(baseRgb.b + baseRgb.b * effectiveFactor);
        }
        
        shades[parseInt(shade)] = `${Math.max(0, Math.min(255, r))} ${Math.max(0, Math.min(255, g))} ${Math.max(0, Math.min(255, b))}`;
    }
    
    // Ensure base colors are accurate
    shades[600] = `${baseRgb.r} ${baseRgb.g} ${baseRgb.b}`;
    shades[500] = `${Math.min(255, baseRgb.r + 20)} ${Math.min(255, baseRgb.g + 20)} ${Math.min(255, baseRgb.b + 20)}`;

    return shades;
}


export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        const storedTheme = localStorage.getItem('app-theme');
        return (storedTheme === 'dark' || storedTheme === 'light') ? storedTheme : 'dark';
    });
    
    // Simulate admin-controlled branding. Default is blue.
    const [brandColor, setBrandColor] = useState('#2563eb'); 

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    useEffect(() => {
        const shades = generateShades(brandColor, theme);
        const root = window.document.documentElement;
        for (const [shade, rgbString] of Object.entries(shades)) {
             root.style.setProperty(`--color-primary-${shade}`, rgbString);
        }
    }, [brandColor, theme]);


    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    const value = {
        theme,
        setTheme,
        brandColor,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};