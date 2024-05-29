// Register.jsx
import { Formik, Field, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import useAuthStore from '../store/authStore'; // import the Zustand store

const Register = () => {
  const register = useAuthStore((state) => state.register); // get the register action from the store

  const initialValues = {
    email: '',
    password: '',
  };

  const validationSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email').required('Email is required'),
    password: Yup.string().required('Password is required'),
  });

  const onSubmit = (values, { setSubmitting }) => {
    // Here you would usually make a request to your API to register the user
    console.log(values);

    // Call the register action from the Zustand store
    register(values.email, values.password);

    setSubmitting(false);
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
    >
      <Form>
        <div>
          <label htmlFor="email">Email</label>
          <Field name="email" type="email" />
          <ErrorMessage name="email" component="div" />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <Field name="password" type="password" />
          <ErrorMessage name="password" component="div" />
        </div>

        <button type="submit">Register</button>
      </Form>
    </Formik>
  );
};

export default Register;
