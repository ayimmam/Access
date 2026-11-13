import { AccessibleLesson } from './lesson-element';

if (!customElements.get('alx-accessible-lesson')) {
  customElements.define('alx-accessible-lesson', AccessibleLesson);
}
