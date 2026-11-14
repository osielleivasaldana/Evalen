import React from 'react';
import { render } from '@testing-library/react';

jest.mock('../services/api', () => ({
  apiService: { isAuthenticated: () => false },
}));

import LandingPage from './LandingPage';

it('renders without crashing', () => {
  const { container } = render(<LandingPage />);
  expect(container.textContent).toMatch(/Evalen/i);
});
