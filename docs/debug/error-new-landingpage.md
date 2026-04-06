    2 | import { useTheme } from '../../contexts/ThemeContext';

  > 3 | import { ArrowRight } from 'lucide-react';

      |                            ^^^^^^^^^^^^^^

    4 |

    5 | // Inline SVG components for social icons not available in lucide-react v1.7.0

    6 | const TwitterIcon: React.FC<{ className?: string }> = ({ className }) => (


ERROR in src/landing/components/LandingNavbar.tsx:3:36

TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

    1 | import React, { useState } from 'react';

    2 | import { useTheme } from '../../contexts/ThemeContext';

  > 3 | import { Sun, Moon, Menu, X } from 'lucide-react';

      |                                    ^^^^^^^^^^^^^^

    4 | import { apiService } from '../../services/api';

    5 |

    6 | const LandingNavbar: React.FC = () => {


ERROR in src/landing/components/LandingPricing.tsx:4:23

TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

    2 | import { useTheme } from '../../contexts/ThemeContext';

    3 | import { useScrollAnimation } from '../hooks/useScrollAnimation';

  > 4 | import { Check } from 'lucide-react';

      |                       ^^^^^^^^^^^^^^

    5 |

    6 | const plans = [

    7 |   {


ERROR in src/landing/components/LogoCloud.tsx:4:63

TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

    2 | import { useTheme } from '../../contexts/ThemeContext';

    3 | import { useScrollAnimation } from '../hooks/useScrollAnimation';

  > 4 | import { Building2, Cpu, FlaskConical, Database, Cloud } from 'lucide-react';

      |                                                               ^^^^^^^^^^^^^^

    5 |

    6 | const companies = [

    7 |   { name: 'TechCorp', icon: Building2 },


ERROR in src/landing/components/Testimonials.tsx:4:22

TS2307: Cannot find module 'lucide-react' or its corresponding type declarations.

    2 | import { useTheme } from '../../contexts/ThemeContext';

    3 | import { useScrollAnimation } from '../hooks/useScrollAnimation';

  > 4 | import { Star } from 'lucide-react';

      |                      ^^^^^^^^^^^^^^

    5 |

    6 | const testimonials = [

    7 |   {