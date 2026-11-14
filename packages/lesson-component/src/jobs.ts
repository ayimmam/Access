import { CareerGateway } from './career-element';

if (!customElements.get('access-career-gateway')) {
  customElements.define('access-career-gateway', CareerGateway);
}
