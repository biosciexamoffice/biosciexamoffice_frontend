// store/api/registrationFormsApi.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const registrationFormsApi = createApi({
  reducerPath: "registrationFormsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:10000" }),
  endpoints: (builder) => ({
    generateRegistrationData: builder.mutation({
      query: (body) => ({
        url: "/api/registration-forms",
        method: "POST",
        body, // { level, session, semester }
      }),
    }),
  }),
});

export const { useGenerateRegistrationDataMutation } = registrationFormsApi;
